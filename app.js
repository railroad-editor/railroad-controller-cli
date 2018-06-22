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

console.log(process.env)

const start = async () => {
  const answers = await inquirer.prompt(QUESTIONS)
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

  createPeer(createSession.bind(this, userId, layouts))

  // createSession(userId, layouts, 1)
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
const createPeer = (onOpen) => {
// Connect to SkyWay, have server assign an ID instead of providing one
// Showing off some of the configs available with SkyWay:).
  const peer = new Peer({
    key: process.env.SKYWAY_API_KEY,
    debug: 3,
  });

  peer.on('open', id => {
    console.log('Peer ID', id)
    onOpen(id)
    // SessionAPI.createSession('a', 'b', 'c').catch((e) => {
    //   console.log(e)
    //   console.log('faillll')
    // })
  });

  // Await connections from others
  peer.on('connection', c => {
    console.log('connection')
    c.on('open', () => handleOpen(c));
  });

  peer.on('error', err => console.log(err));

// function connectTo() {
//   const c = peer.connect("BpCsQLfpaZB34ZuA", {
//     label:    'chat',
//     metadata: {message: 'hi i want to chat with you!'},
//   });
//   c.on('open', () => { handleOpen(c); });
// }

  function handleOpen(c) {
    c.on('data', data => {
      console.log('data', data)
    });
    c.on('close', () => {
      console.log('connection closed.')
    });
    c.on('error', err => alert(err));
// connectedPeers[c.remoteId] = 1;
  }

}


// Connect to a peer
// $('#connect').on('submit', e => {
//   e.preventDefault();
//   const requestedPeer = $('#rid').val();
//   if (!connectedPeers[requestedPeer]) {
//     // Create 2 connections, one labelled chat and another labelled file.
//     const c = peer.connect(requestedPeer, {
//       label:    'chat',
//       metadata: {message: 'hi i want to chat with you!'},
//     });
//
//     c.on('open', () => {
//       connect(c);
//       connectedPeers[requestedPeer] = 1;
//     });
//
//     c.on('error', err => alert(err));
//
//     const f = peer.connect(requestedPeer, {label: 'file', reliable: true});
//
//     f.on('open', () => {
//       connect(f);
//     });
//
//     f.on('error', err => alert(err));
//   }
// });
//
// // Close a connection.
// $('#close').on('click', () => {
//   eachActiveConnection(c => {
//     c.close();
//   });
// });
//
// // Send a chat message to all active connections.
// $('#send').on('submit', e => {
//   e.preventDefault();
//   // For each active connection, send the message.
//   const msg = $('#text').val();
//   eachActiveConnection((c, $c) => {
//     if (c.label === 'chat') {
//       c.send(msg);
//       $c.find('.messages').append('<div><span class="you">You: </span>' + msg
//         + '</div>');
//     }
//   });
//   $('#text').val('');
//   $('#text').focus();
// });
//
// // Show browser version
// $('#browsers').text(navigator.userAgent);
//
// // Make sure things clean up properly.
// window.onunload = window.onbeforeunload = function(e) {
//   if (!!peer && !peer.destroyed) {
//     peer.destroy();
//   }
// };
//
// // Handle a connection object.
//
// // Goes through each active peer and calls FN on its connections.
// function eachActiveConnection(fn) {
//   const actives = $('.active');
//   const checkedIds = {};
//   actives.each((_, el) => {
//     const peerId = $(el).attr('id');
//     if (!checkedIds[peerId]) {
//       const conns = peer.connections[peerId];
//       for (let i = 0, ii = conns.length; i < ii; i += 1) {
//         const conn = conns[i];
//         fn(conn, $(el));
//       }
//     }
//     checkedIds[peerId] = 1;
//   });
// }


start()


