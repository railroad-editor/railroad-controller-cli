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
require('dotenv').config()
// const dotenvExpand = require('dotenv-expand')
// dotenvExpand(myEnv)


const QUESTIONS = [
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
];

// console.log(process.env)

/**
 * メインルーチン
 */
const main = async () => {

  // console.log('Searching arduino...')
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


  // const answers = await inquirer.prompt(QUESTIONS)
  // console.log( JSON.stringify(answers, null, "  ") );

  const userInfo = await Amplify.Auth.signIn(answers['email'], answers['password'])
    .catch((e) => {
      console.log(chalk.red('Login failed!'))
      console.log(chalk.red('Please confirm the email address and password.'))
      process.exit(1)
    })

  const userId = userInfo.username

  console.log(chalk.green('Login succeeded.'))
  // console.log(userInfo)

  const layouts = await LayoutAPI.fetchLayoutList(userId)

  createTable(layouts)

  createPeer(createSession.bind(this, userId, layouts), serialPort)

}

/**
 * レイアウトテーブルを出力する
 */
const createTable = (layouts) => {
  const nameColumnWidth = Math.max(...layouts.map(layout => layout.name.length)) + 3

  const table = new Table({
    head: [chalk.blue('ID'), chalk.blue('Name'), chalk.blue('Last modified')],
    colWidths: [5, nameColumnWidth, 20]
  })

  layouts.map((layout, idx) => [idx, layout.name, moment(layout.lastModified).format('YYYY/MM/DD, hh:mm')])
    .forEach(col => table.push(col))

  console.log('Your Layouts:')
  console.log(table.toString())
}

/**
 * セッションを作成する
 */
const createSession = async (userId, layouts, peerId) => {
  const QUESTIONS = [
    {
      type: "number",
      name: "id",
      message: "Input Layout ID to connect"
    }
  ];

  const answers = await inquirer.prompt(QUESTIONS)
  // console.log( JSON.stringify(answers, null, "  ") );

  const layoutId = layouts[answers.id].id

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
      serialPort.write(data)
    });
    conn.on('close', () => {
      console.log('Connection closed.')
    });
    conn.on('error', err => {
      console.log(chalk.red(err))
    });
  }
}



main()


