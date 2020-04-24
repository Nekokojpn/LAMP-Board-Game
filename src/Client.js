const WIDTH = 1080;
const HEIGHT = 720;
//For phina.
let optionsPhina = null;
let socket = io('http://192.168.33.10:3000');
let app;

let waitingSceneMessage = null;
let pauseSceneMessage = null;

let roomId = null;
let playerName = null;
let roomName = null;
let passWord = null;

setTimeout(() => {
    while((playerName = window.prompt('名前を入力してください。')) === null);
}, 100);

phina.globalize();

function createLabel(self, text, x, y, fillColor, fontSize, isOriginSet) {
    let label = Label(text).addChildTo(self);
    if(isOriginSet) label.origin.set(0, 0);
    label.x = x;
    label.y = y;
    label.fill = fillColor;
    label.fontSize = fontSize;
    return label;
}


//Join to room
phina.define('GameScene', {
    superClass: 'DisplayScene',
    init: function(options) {
        this.superInit(options);
        
        this.backgroundColor = 'black';
        this.title = createLabel(this, roomName, 0, 0, 'white', 48, true);
        
        socket.emit('JoinRoom', {'playerName': playerName, 'roomId': roomId, 'roomName': roomName, 'passWord': passWord});
        waitingSceneMessage = '入室しています...';
        let waitingScene = WaitingScene(options);
        setTimeout(() => {
            app.pushScene(waitingScene);
        }, 100); 
        socket.on('JoinDenied', message => {
            setTimeout(() => { waitingScene.exit(); }, 500);
            pauseSceneMessage = message;
            app.pushScene(PauseScene(options));
        });
        socket.on('ReplyJoin', roomId => {
            setTimeout(() => { waitingScene.exit(); }, 500);
        });
    }
});

phina.define('WaitingScene', {
    superClass: 'DisplayScene',
    init: function(options) {
        this.superInit(options);

        this.backgroundColor = 'rgba(0, 0, 0, 0.7)';

        createLabel(this, waitingSceneMessage, this.gridX.center(), this.gridY.center(), 'white', 32, false);
    }
});

phina.define('PauseScene', {
    superClass: 'DisplayScene',
    init: function(options) {
        this.superInit(options);
        this.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        self = this;
        createLabel(this, pauseSceneMessage, this.gridX.center(), this.gridY.center(), 'white', 32, false);
        Button({
            text: 'OK',
          }).addChildTo(this)
            .setPosition(this.gridX.center(), this.gridY.center(-3))
            .onpush = function() {
                self.exit();
                app.replaceScene(TitleScene(options));
            };
    }
});

phina.define('CreateRoomScene', {
    superClass: 'DisplayScene',
    init: function(options) {
        this.superInit(options);

        this.backgroundColor = 'black';
        this.title = createLabel(this, 'Board game - 部屋作成', 0, 0, 'white', 48, true);
        setTimeout(() => {
            let room_Name;
            let text = 'ルーム名を入力してください';
            while((room_Name = window.prompt(text)) === null) {
                text = 'ルーム名は空にはできません。ルーム名を入力してください。';
            }
            text = 'パスワードを設定する場合は入力してください。';
            let pass_Word = window.prompt(text);
            if(pass_Word === '') pass_Word = null;
            createLabel(this, `ルーム名: ${room_Name}`, this.gridX.center(), 200, 'white', 36, false);
            createLabel(this, pass_Word !== null ? 'Password: ***' : 'Password: 設定されていません', this.gridX.center(), 400, 'white', 36, false);
            this.createRoom_btn = Button({
                text: '部屋作成',
                x: this.gridX.center() - 200,
                y: HEIGHT - 100,
            }).addChildTo(this);

            this.createRoom_btn.onpointend = () => {
                socket.emit('CreateRoom', {'roomName': room_Name, 'passWord': pass_Word});
                waitingSceneMessage = '部屋を作成しています...';
                let waitingScene = WaitingScene(options);
                app.pushScene(waitingScene);
                socket.on('ReplyRoomId', roomId => {
                    setTimeout(() => {
                        waitingScene.exit();
                    }, 500);
                    transitionToGame(roomId, room_Name, pass_Word);
                });
                
            };
            this.back_btn = Button({
                text: '戻る',
                x: this.gridX.center() + 200,
                y: HEIGHT - 100,
                fill: 'Red',
            }).addChildTo(this);
            this.back_btn.onpointend = () => {
                app.replaceScene(TitleScene(options));
            };
        }, 100);

    },

});

phina.define('TitleScene', {
    superClass: 'DisplayScene',
    init: function(options) {
        this.superInit(options);
        optionsPhina = options;
        this.backgroundColor = 'black';
        this.title = createLabel(this, 'Board game - タイトル', 0, 0, 'white', 48, true);
        this.createRoom_btn = Button({
            text: '部屋作成',
            x: 0,
        }).addChildTo(this);
        this.createRoom_btn.origin.set(0, 0);
        this.createRoom_btn.y = HEIGHT - 100;
        this.createRoom_btn.onpointend = () => {
            app.replaceScene(CreateRoomScene(options));
        };
        this.updateRoom_btn = Button({
            text: '更新',
            x: 800,
            y: HEIGHT - 100
        }).addChildTo(this);
        this.updateRoom_btn.origin.set(0, 0);
        this.updateRoom_btn.onpointend = () => {
            this.updateRoom(this);
        }
        setTimeout(() => {
            this.updateRoom(this);
        }, 200); 
        
    },
    updateRoom: (self) => {
        waitingSceneMessage = '部屋を取得しています...';
        let scene = WaitingScene(optionsPhina);
        self.app.pushScene(scene);
        socket.on('ReplyGetRooms', rooms => {
            setTimeout(() => {
                scene.exit();
            }, 500); 
            let x = 100;
            let y = 100;
            for(let i = 0, l = rooms.length; i < l; i++) {
                let room = rooms[i];
                self.btn = Button({
                    width: 400,
                    height: 100,
                    text: `${room['roomName']}\n${room['num']}/2`
                }).addChildTo(self);
                self.btn.origin.set(0, 0);
                self.btn.x = x;
                self.btn.y = y;
                if(room['num'] !== 2)
                    self.btn.fill = 'green';
                else
                    self.btn.fill = 'red';
                if(x === 100)
                    x = 600;
                else {
                    x = 100;
                    y += 120;
                }
                self.btn.onpointend = () => {
                    let ps = null;
                    if(room['passFlg'])
                        ps = window.prompt('パスワードを入力してください。');
                    transitionToGame(room['roomId'], room['roomName'], ps);
                };
            }
        });
        socket.emit('GetRooms');
    },
});

// メイン処理
phina.main(function() {
    // アプリケーション生成
    app = GameApp({
        width: WIDTH,
        height: HEIGHT,
        startLabel: 'title', // メインシーンから開始する
        fit: false,
        scenes: [
            {
                className: 'MainScene',
                label: 'main',
            },
            {
                className: 'TitleScene',
                label: 'title',
                nextLabel: 'main',
            },
            {
                className: 'CreateRoomScene',
                label: 'createroom',
            },
            {
                className: 'GameScene',
                label: 'game'
            },
            {
                className: 'WaitingScene',
                label: 'wait'
            },
            {
                className: 'PauseScene',
                label: 'pause'
            }
        ],
    });
    // アプリケーション実行
    app.run();
});




function transitionToGame(_roomId, _roomName, _passWord) {
    roomId = _roomId;
    roomName = _roomName;
    passWord = _passWord;
    app.replaceScene(GameScene(optionsPhina));
}