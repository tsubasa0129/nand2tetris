const fs = require("fs");
const Parser = require("./parser");
const SymbolTable = require("../assembler/symbolTable");
const {compChanger,destChanger,jumpChanger} = require("./code");
const {A_COMMAND,C_COMMAND,L_COMMAND} = require("./commandType");

/* const inputPath = "../max/Max.asm";
const outputPath = "../max/Max.hack"; */

/* const inputPath = "../rect/Rect.asm";
const outputPath = "../rect/Rect.hack"; */

const inputPath = "../pong/Pong.asm";
const outputPath = "../pong/Pong.hack";

const parser = new Parser(inputPath);
const symbolTable = new SymbolTable();

//1回目のバスの実行（ここにおいては、シンボルテーブルの作成のみしか行わない）これを作成にあたり、シンボルとアドレスの取得が必要
while(parser.hasMoreCommands()){
    //基本的には同様に全てを読み込み、それぞれのメソッドの実行が必要
    let commandType = parser.commandType();

    if(commandType === L_COMMAND){ //ここではlineCounterをアドレスとしたいのだから、（）を排除する必要がある。
        let symbol = parser.symbol(commandType); //ここには数値が帰ることを想定していたけど、シンボルが帰る可能性が出る
        let address = parser.lineCounter + 1 - parser.l_com;
        symbolTable.addEntry(symbol,address); //シンボルテーブルの追加完了

        //コードが少しここの部分可用性が低いので、書き直すならば
    }

    parser.advance();
}

//2回目のバス
const hack = [];
parser.lineCounter = 0;
parser.currentInstruction = parser.instructions[parser.lineCounter];

while(parser.hasMoreCommands()){
    let commandType = parser.commandType();

    if(commandType === A_COMMAND){

        let symbol = parser.symbol(commandType); //ここでシンボルもしくは数値が取得できる。
        let sym = parseInt(symbol,10); //10進数の数値への変換を行う
        let binary;
        console.log(symbol);

        if(isNaN(sym)){
            //まずは変数かシンボルかの検索を行う
            let isContain = symbolTable.contains(symbol);

            if(isContain){
                //含まれる。つまり、定義済みもしくはシンボル
                let address = symbolTable.getAddress(symbol);
                //ここの中で、バイナリへの変換を行う。問題点は１６進数と１０進数をそれぞれ２真数に変換しなければならない
                binary = parseInt(address).toString(2);
            }else{
                //ユーザーの定義した変数になる。ここはRAMアドレス16から
                symbolTable.addEntry(symbol,"new");
                let address = symbolTable.getAddress(symbol);
                binary = address.toString(2);
            }
        }else{
            binary = sym.toString(2);
        }
        while(binary && binary.length < 16){
            binary = "0" + binary;
        }

        hack.push(binary);

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

console.log(hack);
fs.writeFileSync(outputPath,hack.join("\n"));