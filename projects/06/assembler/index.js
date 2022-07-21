const fs = require("fs");
const Parser = require("./parser");
const {compChanger,destChanger,jumpChanger} = require("./code");
const {A_COMMAND,C_COMMAND,L_COMMAND} = require("./commandType");

/* const inputPath = "../max/MaxL.asm";
const outputPath = "../max/MaxL.hack"; */

const inputPath = "../pong/PongL.asm";
const outputPath = "../pong/PongL.hack";

/* const inputPath = "../rect/RectL.asm";
const outputPath = "../rect/RectL.hack"; */

const parser = new Parser(inputPath);

/* 
ここでインスタンスを作成した段階で、コンストラクタが読み込まれる。

初期値として、三つの変数に値を設ける。
①instructions 実行されるアセンブリのコマンドが配列形式で格納されている。
②lineCouter 実行されるコマンドの位置を管理するインデックス番号として用いる。初期値を０とする。
③currentInstruction 現在実行されている命令。初期値は空ではなく、instructionsの０番目を指定している。

*/

const hack = [];
 
while(parser.hasMoreCommands()){

    let commandType = parser.commandType();

    if(commandType === A_COMMAND || commandType === L_COMMAND){
        let symbol = parser.symbol(commandType);

        if(commandType === A_COMMAND){
            //ここは単純な数値変換で問題ない
            let sym = parseInt(symbol,10);

            let s2 = sym.toString(2);

            while(s2.length < 16){
                s2 = "0" + s2;
            }

            //s2が16ビットの機械語となる。おそらくファイルへの書き込みを行う感じかな
            hack.push(s2);
        }else{
            //ちなみに変数等を使う場合は、ここで行う予定
        }

    }else if(commandType === C_COMMAND){
        let comp = parser.comp();
        let dest = parser.dest();
        let jump = parser.jump();

        //C命令の実行時はここで機械語翻訳を行う。
        let compHack = compChanger(comp);
        let destHack = destChanger(dest);
        let jumpHack = jumpChanger(jump);

        //ここで結合する。
        let c_command = "111" + compHack + destHack + jumpHack;
        hack.push(c_command);
    }

    parser.advance(); //一番最後に実行するように設定する。
}

//残りやる部分は、fileの読み込みとファイルの作成をし、そこに順番に書き込みを実行する。
console.log(hack);
fs.writeFileSync(outputPath,hack.join("\n"));
