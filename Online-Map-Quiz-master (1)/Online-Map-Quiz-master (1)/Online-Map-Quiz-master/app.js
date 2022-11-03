var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

let qNum
let qNumList = []
let count = 0

app.io = require('socket.io')()

app.io.on('connection', (socket) => {
  // Connected
  console.log(`[Connected] ${socket.id}`)

  // Disconnected
  socket.on('disconnect', () => {
    console.log(` [Disconnected] ${socket.id}`)
    endGame(socket)
    socket.broadcast.emit('leaveUser', socket.id)
  })

  let newPlayer = joinGame(socket)
  socket.emit('userId', socket.id)

  for (let i = 0; i < players.length; i++) {
    let player = players[i]
    socket.emit('joinUser', {
      id: player.id,
      color: player.color,
      nickname: player.nickname
    })
  }

  socket.broadcast.emit('joinUser', {
    id: socket.id,
    color: newPlayer.color
  })

  // Nickname
  socket.on('customize', (id, nickname, color) => {
    playerMap[id].nickname = nickname
    playerMap[id].color = color
    console.log(playerMap)
    app.io.emit('customize', id, nickname, color)
  })

  // Chatting
  socket.on('chat', (id, msg) => app.io.emit('chat', id, msg))

  socket.on('test', (msg) => {
    app.io.emit('test', msg)
  })

  socket.on('start', (states) => {
    qNumList = []
    count = 0
    newQuestion(states)

    console.log('Game Start')
    console.log(states)
    app.io.emit('start')
  })

  socket.on('turn', () => app.io.emit('turn'))  
  socket.on('turnEnd', () => socket.broadcast.emit('turnEnd'))
  socket.on('newQuestion', (states) => newQuestion(states))

  socket.on('wrong', (states) => {
    count++
    console.log(count)
    if (count === 10) createHint(states)
  })
  socket.on('correct', (id, index) => app.io.emit('correct', id, index))
  socket.on('myCorrect', (index) => socket.broadcast.emit('myCorrect', index))

  socket.on('refresh', (id, index) => app.io.emit('refresh', id, index))

  console.log(playerMap)
})

function getPlayerColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16)
}

class Player {
  constructor(socket) {
    this.socket = socket
    this.color = getPlayerColor()
  }

  get id() {
    return this.socket.id
  }
}

let players = []
let playerMap = {}

function joinGame(socket) {
  let player = new Player(socket)

  players.push(player)
  playerMap[socket.id] = player

  return player
}

function endGame(socket) {
  for (let i = 0; i < players.length; i++) {
    if (players[i].id == socket.id) {
      players.splice(i, 1)
      break
    }
    delete playerMap[socket.id]
  }
}

function createHint(states) {
  let hintNum
  let hintList = []
  hintList.push(qNum)
  
  for (let i = 0; i < 7; i++) {
    
    hintNum = Math.floor(Math.random() * states.length)
    while (hintList.indexOf(hintNum) >= 0) {
      hintNum = Math.floor(Math.random() * states.length)
    }
    hintList.push(hintNum)
  }
  console.log('Hint List :', hintList)
  app.io.emit('hint', hintList)
}

function newQuestion(states) {
  count = 0
  if (qNumList.length === states.length) {
    app.io.emit('end')
    
    return
  }

  qNum = Math.floor(Math.random() * states.length)
  while (qNumList.indexOf(qNum) >= 0) {
      qNum = Math.floor(Math.random() * states.length)
  }
  qNumList.push(qNum)

  app.io.emit('newQuestion', qNum)

  console.log(qNum, qNumList)
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
