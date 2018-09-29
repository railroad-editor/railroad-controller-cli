require('./xhr2')
fetch = require('node-fetch')
const Amplify = require('./aws-amplify')
const WebRTC = require('./wrtc')
const Peer = require('skyway-js');
const SessionAPI = require('./apis/session')
const LayoutAPI = require('./apis/layout')
const inquirer = require('inquirer');
const chalk = require('chalk');
const Table = require('cli-table');
const moment = require('moment')
const SerialPort = require('serialport');
const fs = require('fs');
require('dotenv').config()
// const dotenvExpand = require('dotenv-expand')
// dotenvExpand(myEnv)


// console.log(process.env)

const CONFIG_FILE = 'railroad-controller.conf'

var CONFIG = {
  credential: {
    email: null,
    password: null
  },
  layout: {
    id: null,
    name: null
  }
}

const saveConfig = () => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG))
}

const loadConfig = () => {
  try {
    fs.statSync(CONFIG_FILE)
  } catch (err) {
    return
  }

  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE))
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
const login = async () => {

  // Credentialが設定ファイルからロードできたらそれを使う
  // そうでなければプロンプトを表示
  let credential
  if (CONFIG.credential.email) {
    credential = CONFIG.credential
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

  const userInfo = await Amplify.Auth.signIn(credential.email, credential.password)
    .catch((e) => {
      console.log(chalk.red('Login failed!'))
      console.log(chalk.red('Please confirm the email address and password.'))
      process.exit(1)
    })

  console.log(chalk.green('Login succeeded.'))

  if (! CONFIG.credential.email) {
    // 自動ログインを設定するか聞く
    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "enableAutoLogin",
        message: "Do you want to enable auto login by this account?"
      }
    ])

    if (answer.enableAutoLogin) {
      CONFIG.credential.email = credential.email
      CONFIG.credential.password = credential.password
      saveConfig()
    }
  }

  return userInfo.username
}


/**
 * レイアウトのリストをテーブルとして表示し、その一つをユーザーに選択させる。
 * @param userId
 * @returns {Promise<String>} Layout ID
 */
const selectLayout = async (userId) => {
  const layouts = await LayoutAPI.fetchLayoutList(userId)

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
  if (CONFIG.layout.id) {
    layoutId = CONFIG.layout.id
    console.log(chalk.green(`Use layout ${CONFIG.layout.name}`))
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
        message: "Do you want to use this layout as default?"
      }
    ])
    if (answers.userAsDefault) {
      layoutId = layouts[answers.id].id
      CONFIG.layout.id = layoutId
      CONFIG.layout.name = layouts[answers.id].name
      saveConfig()
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

  console.log(chalk.green('Waiting for connection from the layout...'))
}


/**
 * SkyWayに接続する
 */
const createPeer = (onOpen, serialPort) => {
// Connect to SkyWay, have server assign an ID instead of providing one
// Showing off some of the configs available with SkyWay:).
  const peer = new Peer({
    key: process.env.SKYWAY_API_KEY,
    debug: 3,
  });

  peer.on('open', id => {
    console.log('Opened: Peer ID', id)
    onOpen(id)
  });

  // Await connections from others
  peer.on('connection', conn => {
    console.log('Connecting...')
    console.log('Remote Peer ID', conn.remoteId)
    conn.on('open', () => onConnectionOpen(conn));
  });

  peer.on('error', err => {
    console.log(chalk.red(err))
  });

  const onConnectionOpen = (conn) => {
    console.log(chalk.green('Connected.'))
    conn.on('data', data => {
      console.log(chalk.green(`DATA: ${data}`))   //`
      // echo back
      conn.send(data)
      serialPort.write(data + "\n")
    });
    conn.on('close', () => {
      console.log('Connection closed.')
    });
    conn.on('error', err => {
      console.log(chalk.red(err))
    });
  }
}


/**
 * メインルーチン
 */
const main = async () => {

  loadConfig()

  const serialPort = await findArduino()

  const userId = await login()

  const layoutId = await selectLayout(userId)

  createPeer(createSession.bind(this, userId, layoutId), serialPort)

}



main()


