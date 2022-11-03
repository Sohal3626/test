let players = []
let playerMap = {}
let myId
let second, minute

function Player(id, color, nickname) {
    this.id = id
    this.nickname = nickname
    this.color = color
    this.score = 0
}

function joinUser(id, color, nickname) {
    let player = new Player(id, color, nickname)

    players.push(player)
    playerMap[id] = player

    return player
}

function leaveUser(id) {
    for (let i = 0; i < players.length; i++) {
        if (players[i].id == id) {
            players.splice(i, 1)
            break
        }
        delete playerMap[id]
    }
}

let socket = io()

socket.on('userId', (data) => {
    myId = data
    console.log(myId)
})
socket.on('joinUser', (data) => {
    if (data.id == myId) {
        $('#players').append(`<li id="${data.id}" style="font-weight: bold; color: ${data.color}">${data.nickname} (나) : 0</li>`)
    } else {
        $('#players').append(`<li id="${data.id}" style="font-weight: bold; color: ${data.color}">${data.nickname} : 0</li>`)
    }

    console.log(data)
    joinUser(data.id, data.color, data.nickname)
})

socket.on('leaveUser', (id) => leaveUser(id))

let qNumList = []

$(document).ready(() => {
    $('main, #timer').hide()

    $('#colorpicker').farbtastic('#color')

    // Socket Test
    // socket.emit('test', 'Hello')
    // socket.on('test', (msg) => console.log(msg))

    // Nickname
    $('#customize').submit((e) => {
        e.preventDefault()
        if ($('#nickname').val()) {
            socket.emit('customize', myId, $('#nickname').val(), $('#color').val())
            $('#customize').hide()
        } else {
            alert('닉네임을 입력하세요')
        }
    })

    // Chatting
    $('#chat').submit((e) => {
        e.preventDefault()
        if ($('#chat input').val()) {
            socket.emit('chat', myId, $('#chat input').val())
            $('#chat input').val('')
        }
    })

    socket.on('customize', (id, nickname, color) => {
        if (id === myId)
            $(`#${id}`).text(`${nickname} (나) : 0`)
        else
            $(`#${id}`).text(`${nickname} : 0`)
        
        $(`#${id}`).css('color', color)

        playerMap[id].nickname = nickname
        playerMap[id].color = color
    })

    socket.on('chat', (id, msg) => {
        $('#messages').append(`<li>[${playerMap[id].nickname}] ${msg}</li>`)
    })

    let map = '/geojson/SIG Simplified.json'
    // let map = '/geojson/AL_00_D001_20210703/AL_00_D001_20210703(EMD)/Incheon (EMD).geojson'
    // let map = '/geojson/AL_00_D001_20210703/AL_00_D001_20210703(SIG)/Without Gu.geojson'
    let requestURL = map
    let request = new XMLHttpRequest()
    request.open('GET', requestURL)
    request.responseType = 'json'
    request.send()

    let timer
    let states = []
    let neighbors = []
    let qNum
    let myScore = 0
    let opScore = 0

    request.onload = function() {
        request.response.features.forEach(element => states.push(element.properties.A2))
        // request.response.features.forEach(element => states.push(element.properties.KOR))
        console.log('States : ', states)

        request.response.features.forEach(element => {
            if (element.properties.NEIGHBORS) { 
                neighbors.push(element.properties.NEIGHBORS.split(','))
            }
        })
                
        console.log(neighbors)

        // Game Start
        $('#start').click(() => {
            socket.emit('start', states)
        })

        socket.on('start', () => {
            console.log(players, playerMap)
            $('h2, #start, #mapSelect, label[for="mapSelect"]').hide()
            $('main, #timer').show()

            second = 0, minute = 0
            timer = setInterval(timeUpdate, 1000)
        })

        socket.on('newQuestion', (num) => {
            qNum = num
            $('#question').text(states[qNum])
            $('path').removeClass('wrong').remove
            Class('hint')
        })

        socket.on('hint', hintList => {
            hintList.forEach(index => {
                $(`#states path:eq(${index})`).addClass('hint').removeClass('wrong')
            })
        })

        socket.on('correct', (id, index) => {
            playerMap[id].score++;
            console.log(id, index)

            $(`#${id}`).text($(`#${id}`).text().split(':')[0] + ': ' + playerMap[id].score)
            $(`#states path:eq(${index - 1})`).css('fill', playerMap[id].color).removeClass('hint')
        })

        socket.on('myCorrect', (index) => {
            opScore++
            $('#score').text(`내 점수: ${myScore} | 상대 점수 : ${opScore} |`)
            // $(`#states path:eq(${index - 1})`).addClass('opCorrect')
        })

        socket.on('end', () => {
            clearInterval(timer)
            $('#timer').text($('#timer').text() + ' [종료]')
        })

        $(document).on('click', 'path', function(){
            $('#current').text(`클릭: ${this.id}`)
            if (this.id === states[qNum]) {
                myScore++
                $('#score').text(`내 점수: ${myScore} | 상대 점수 : ${opScore}`)
                // alert('정답')
                // $(this).toggleClass('correct')
                $(this).css('fill', playerMap[myId].color).removeClass('hint')

                socket.emit('correct', myId, $(this).index())
                socket.emit('newQuestion', states)

            } else {
                // alert('오답')
                $(this).removeClass('hint')
                $(this).addClass('wrong')
                socket.emit('wrong', states)
            }
        })
    }
})

function newQuestion(states) {
    if (qNumList.length === states.length) {
        $('#question').text('종료')
        
        return
    }

    qNum = Math.floor(Math.random() * states.length)
    while (qNumList.indexOf(qNum) >= 0) {
        qNum = Math.floor(Math.random() * states.length)
    }
    qNumList.push(qNum)

    $('#question').text(states[qNum])
    $('path').removeClass('wrong').removeClass('hint')

    return qNum
}

function timeUpdate() {
    second++
    if (second >= 60) {
        minute++
        second = 0
    }
    $('#timer').text(`${minute}:${second}`)
}