let players = []
let playerMap = {}
let myId
let second, minute

function Player(id, color, nickname) {
    this.id = id
    this.nickname = nickname
    this.color = color
    this.occupied = []
    this.neighbors = new Set()
    this.inSight = new Set()
    this.score = 0
    this.special = 0
    this.port = 0
    this.airport = 0
    this.airportScore = 0
    this.grow = 0
    this.movePoint = 4

}

function State(name, population, color, neighbors) {
    this.name = name
    this.population = population
    this.color = color
    this.neighbors = neighbors
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
    console.log('My ID :', myId)
})

socket.on('joinUser', (data) => {
    if (data.id == myId) {
        $('#players').append(`<li id="${data.id}" style="font-weight: bold; color: ${data.color}">${data.nickname} (나) : 0 / 0 (0%)</li>`)
    } else {
        $('#players').append(`<li id="${data.id}" style="font-weight: bold; color: ${data.color}">${data.nickname} : 0 / 0 (0%)</li>`)
    }

    console.log('[Join User]', data)
    joinUser(data.id, data.color, data.nickname)
})

socket.on('leaveUser', (id) => leaveUser(id))

let url = '/geojson/SIG.geojson'
// let url = '/geojson/US States.geojson'
function getMapData(url) {
    return new Promise((resolve, reject) => {
        $.getJSON(url, (response) => {
            if (response) resolve(response)
            else reject(new Error('Request failed'))
        })
    })
}

function parseMapData(data) {
    let states = []
    let features = data.features

    features.forEach(element => {
        let state = element.properties
        let neighbors = state.neighbors.split(',').map(item => parseInt(item))
        
        states[state.id] = new State(state.state, parseInt(state.population), `#${parseInt(state.population / 3500).toString(16)}ffff`, neighbors)
    })
    // features.forEach(element => arr.push(`#${parseInt(element.properties.population / 3500).toString(16)}ffff`))
    // features.forEach((element, idx) => console.log(`${element.properties.state} (${element.properties.population}): rgb(${255 - parseInt(element.properties.population / 3400)}, 255, 255)`))

    return states
}

function customize() {
    $('#customize').submit((e) => {
        e.preventDefault()
        if ($('#nickname').val()) {
            socket.emit('customize', myId, $('#nickname').val(), $('#color').val())
            $('#customize').hide()
        } else {
            alert('닉네임을 입력하세요')
        }
    })
}

function chat() {
    $('#chat').submit((e) => {
        e.preventDefault()
        if ($('#chat input').val()) {
            socket.emit('chat', myId, $('#chat input').val())
            $('#chat input').val('')
        }
    })

    $('#clear').click(() => {
        $('#messages *').hide()
    })
}

function timeUpdate() {
    second++
    if (second >= 60) {
        minute++
        second = 0
    }
    $('#timer').text(`${minute}:${second}`)
}

async function game() {
    $('header, main, #question').hide()
    $('#colorpicker').farbtastic('#color')

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

    let timer
    
    // let states = []
    let neighbors = []
    let qNum
    let myScore = 0
    let opScore = 0
    let myTurn = true

    let data = await getMapData(url)
    states = parseMapData(data)

    special.forEach(e => {
        states[e].special = true
        $(`#${e}`).addClass('special')
    })

    ports.forEach(e => {
        states[e].port = true
        $(`#${e}`).addClass('port')
    })

    airports.forEach(e => {
        states[e].airport = true
        $(`#${e}`).addClass('airport')
    })

    console.log('States :', states)

    $('#start').click(() => {
        socket.emit('start', states)
    })  

    socket.on('start', () => {
        console.log('[Players]', players, playerMap)
        $('#settings').hide()
        $('header, main').show()

        second = 0, minute = 0
        timer = setInterval(timeUpdate, 1000)
    })

    socket.on('correct', (id, index) => {
        // playerMap[id].score += states[index].population
        console.log('[Occupied]', id, index, playerMap[id].score)

        // $(`#${id}`).text($(`#${id}`).text().split(':')[0] + ': ' + playerMap[id].score)
        $(`#${index}`).css('fill', playerMap[id].color).removeClass('special port airport')
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

    socket.on('turnEnd', () => {
        $('#turn').show()
        myTurn = true

        let me = playerMap[myId]
        me.score *= 1 + me.grow / 200
        me.score = parseInt(me.score)
        me.airportScore += me.airport
        me.movePoint += 4


        socket.emit('refresh', playerMap)

        console.log('[Grow]', me.id, me.score, me.airportScore)
    })

    socket.on('refresh', (_playerMap, index) => {
        playerMap = _playerMap
        // let player = playerMap[id]

        for (let i in playerMap) {
            let player = playerMap[i]
            
            player.neighbors = new Set()
            player.inSight = new Set()

            player.occupied.forEach(e => {
                $(`#${e}`).css('fill', player.color).removeClass('special port airport').addClass('occupied')

                states[e].neighbors.forEach(f => player.neighbors.add(f))
            })

            player.neighbors.forEach(e => {
                states[e].neighbors.forEach(f => {
                    player.inSight.add(f)
                })
            })

            $(`#${player.id}`).text(`${player.nickname} : ${player.score} / ${player.special} / ${player.port} / (${player.grow}% / ${player.airport} / ${player.airportScore} / ${player.movePoint})`)
        }   

        playerMap[myId].neighbors.forEach(e => $(`#${e}`).removeClass('fog'))
        
        console.log('[Refresh]', playerMap)

        // player.grow = player.special * player.port
        // player.score *= 1 + player.grow / 100

        // player.score += states[index].population
        
    })
    
    $('#skip').click(() => {
        socket.emit('turnEnd')
        myTurn = false
        $('#turn').hide()
    })

    $(document).on('click', 'path', function(){
        let me = playerMap[myId]
        
        if (myTurn == true) {
            me.movePoint -= 2

            me.occupied.push(parseInt(this.id))
            me.score += states[this.id].population
            // me.score += states[this.id].population

            if (states[this.id].special) {
                me.special += 1
                // me.score *= 1.1
                // me.score = parseInt(me.score)
            }

            if (states[this.id].port) {
                me.port += 1
            }

            if (states[this.id].airport) {
                me.airport += 1
            }

            me.grow = me.special * me.port * 0.5

            socket.emit('refresh', playerMap)

            $('#turn').hide()

            if (me.movePoint <= 0) {
                myTurn = false
                socket.emit('turnEnd')
            }
        }
    })
}

function preload() {
    customize()
    chat()
}

function cursor() {
    $(document).on('mousemove', 'path', (e) => {
        $('#cursor').css('display', 'auto').text(`${states[e.target.id].name} (${states[e.target.id].population})${stateNeighborEmoji(states[e.target.id])}`)
        $('#cursor').css('left', e.pageX + 15).css('top', e.pageY)
    })

    $(document).on('mouseenter', 'path', e => {
        states[e.target.id].neighbors.forEach(idx => {
            if (e.target.id == idx) return
            if ($(`#${idx}`).hasClass('occupied')) return
            $(`#${idx}`).addClass('neighbor')
        })
    })

    $(document).on('mouseleave', 'path', e => {
        states[e.target.id].neighbors.forEach(idx => {
            $(`#${idx}`).removeClass('neighbor')
        })
    })
}

function stateNeighborEmoji(state) {
    if (state.special) return "🎁"
    if (state.port) return "🚢"
    if (state.airport) return "✈️"
    return ""
}

let states = []
let special = [126, 242, 159, 162, 146, 198, 190, 179, 172, 248, 235, 215, 217]
let ports = [50, 121, 181, 28, 185, 165, 204]
let airports = [139, 234, 119, 135, 16, 43]

$(document).ready(() => {
    game()
    cursor()
    preload()

    let toggle = false

    $('#population').click(() => {
        if (toggle) {
            $('path').css('fill', '#ffffff')
            toggle = true
        } else {
            states.forEach((element, idx) => $(`#${idx}`).css('fill', `rgb(${255 - parseInt(element.population / 3400)}, 255, 255)`))
            toggle = false
        }
    })
})