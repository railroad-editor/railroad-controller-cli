const Peer = require('./skyway-js');
const Amplify = require('./aws-amplify')
const aws_exports = require('./aws-exports');
const SessionAPI = require('./apis/session')
const LayoutAPI = require('./apis/layout')
const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table');
const moment = require('moment')
const SerialPort = require('serialport');
const commander = require('commander');
const {saveConfig, loadConfig} = require('./config');

require('dotenv').config();

commander.option('-n, --no-arduino', 'Connects to Railroad-Editor without Arduino.');
commander.option('-i, --init', 'Initializes configuration file, ignoring existing one.');
commander.option('-e, --env <env-name>', 'Environment name. For development purpose only.', 'prod');
commander.parse(process.argv);

const main = async () => {

  loadAwsAmplifyConfig(commander.env)

  let config = loadConfig(commander.init)

  let serialPort = null
  if (commander.arduino) {
    serialPort = await findArduino()
  }

  const userId = await login(config)
  const layoutId = await selectLayout(userId, config)

  createPeer(createSession.bind(this, userId, layoutId), serialPort)
}


const loadAwsAmplifyConfig = (env) => {
  Amplify.default.configure(aws_exports[env])
}


/**
 * このデバイスに接続されたArduinoを検索し、そのSerialPortを返す
 * @returns {Promise<SerialPort|*>}
 */
const findArduino = async () => {
  const ports = await SerialPort.list()
  const arduinoPort = ports.find(port => port.manufacturer && port.manufacturer.startsWith('Arduino'))

  if (! arduinoPort) {
    console.log(chalk.red('Arduino not found!'))
    console.log(chalk.red('Please connect Arduino first.'))
    process.exit(1)
  }

  // シリアルポートの初期化
  const serialPort = new SerialPort(arduinoPort.comName, { baudRate: 9600 });
  serialPort.on('data', (data) => {
    process.stdout.write(data.toString())
  });

  console.log(chalk.green(`Arduino detected: ${arduinoPort.comName}`))
  return serialPort
}


/**
 * Railroad-Editorにログインする
 * @returns {Promise<String>} User ID (Email)
 */
const login = async (config) => {

  // Credentialが設定ファイルからロードできたらそれを使う
  // そうでなければプロンプトを表示
  let credential
  if (config.credential.email) {
    credential = config.credential
  } else {
    credential = await inquirer.prompt([
      {
        type: "input",
        name: "email",
        message: "Email Address"
      },
      {
        type: "password",
        name: "password",
        message: "Password"
      }
    ])
  }

  await Amplify.Auth.signIn(credential.email, credential.password)
    .catch((e) => {
      console.log(chalk.red('Login failed!'))
      console.log(chalk.red('Please confirm the email address and password.'))
      process.exit(1)
    })
  const userInfo = await Amplify.Auth.currentUserInfo()
  console.log(chalk.green('Login succeeded.'))

  if (! config.credential.email) {
    // 自動ログインを設定するか聞く
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "enableAutoLogin",
        message: "Do you want to enable auto login by this account?"
      }
    ])

    if (answer.enableAutoLogin) {
      config.credential.email = credential.email
      config.credential.password = credential.password
      saveConfig(config)
    }
  }

  return userInfo.id
}


/**
 * レイアウトのリストをテーブルとして表示し、その一つをユーザーに選択させる。
 * @param userId
 * @returns {Promise<String>} Layout ID
 */
const selectLayout = async (userId, config) => {
  let layouts = await LayoutAPI.fetchLayoutList(userId)
  layouts = layouts.map(layout => {
    if (! layout.name) {
      layout.name = ""
    }
    return layout
  })
  const nameColumnWidth = Math.max(...layouts.map(layout => layout.name.length)) + 3

  const table = new Table({
    head: [chalk.blue('ID'), chalk.blue('Name'), chalk.blue('Last modified')],
    colWidths: [5, nameColumnWidth, 20]
  })

  layouts.map((layout, idx) => [idx, layout.name, moment(layout.lastModified).format('YYYY/MM/DD, hh:mm')])
    .forEach(col => table.push(col))

  console.log('Your Layouts:')
  console.log(table.toString())

  // Layout IDが設定ファイルからロードできたらそれを使う
  // そうでなければプロンプトを表示
  let layoutId
  if (config.layout.id) {
    layoutId = config.layout.id
    console.log(chalk.green(`Using layout ${config.layout.name}`))
  } else {
    const answers = await inquirer.prompt([
      {
        type: "number",
        name: "id",
        message: "Input Layout ID to connect"
      },
      {
        type: "confirm",
        name: "userAsDefault",
        message: "Do you want to use this layout as default?",
        default: false
      }
    ])
    layoutId = layouts[answers.id].id
    config.layout.id = layoutId
    config.layout.name = layouts[answers.id].name
    if (answers.userAsDefault) {
      saveConfig(config)
    }
  }

  return layoutId
}


/**
 * セッションを作成する
 */
const createSession = async (userId, layoutId, peerId) => {

  await SessionAPI.createSession(userId, layoutId, peerId)
    .catch((e) => {
      console.log(chalk.red('Failed to create session!'))
    })

  console.log(chalk.green(`Waiting for connection from the layout on peer ID: ${peerId}`))
}


/**
 * SkyWayに接続する
 */
const createPeer = (onOpen, serialPort) => {
  const peer = new Peer({
    key: process.env.SKYWAY_API_KEY,
    debug: 1,
  });

  peer.on('open', id => {
    console.log('Opened: Peer ID', id)
    onOpen(id)
  });

  peer.on('error', err => {
    console.log(chalk.red(err))
  });

  peer.on('connection', conn => {
    console.log('Connecting...')
    console.log('Remote Peer ID', conn.remoteId)
    conn.on('open', () => onConnectionOpen(conn, serialPort));
  });
}

const onConnectionOpen = (conn, serialPort) => {
  console.log(chalk.green('Connected.'))
  conn.on('data', data => {
    console.log(chalk.green(`DATA: ${data}`))   //`
    // echo back
    conn.send(data)
    if (serialPort) {
      serialPort.write(data + "\n")
    }
  });
  conn.on('close', () => {
    console.log('Connection closed.')
  });
  conn.on('error', err => {
    console.log(chalk.red(err))
  });
}


main()


