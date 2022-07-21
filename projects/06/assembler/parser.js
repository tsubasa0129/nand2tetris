//最初にファイルを読み込む必要がある。
const fs = require('fs');
const {A_COMMAND,C_COMMAND,L_COMMAND} = require("./commandType");

class Parser {
    constructor(file){
        this.instructions = [];

        const fileData = fs.readFileSync(file,{encoding:"utf-8"});
        const array = fileData.split("\r\n");

        for(var i=0;i<array.length;i++){

            if(array[i].includes("//")){
                var compArray = array[i].split("//");

                if(compArray[0] !== ""){
                    this.instructions.push(compArray[0].trim());
                }
            }else if(array[i] !== ""){
                this.instructions.push(array[i].trim());
            }
        }

        this.lineCounter = 0; //現在の実行されている命令の箇所を示すもの
        this.currentInstruction = this.instructions[this.lineCounter]; //初期値はデフォルト（教材）とは異なるが、一番目の処理を代入してしまう
        this.l_com = 0;
    }

    hasMoreCommands(){ //おそらくindexで一つずつコマンドを取り出していき、lineCounterをインクリメントする。
        //数の比較を行い、命令がまだ存在するのかを判定する
        if(this.lineCounter < this.instructions.length){
            return true;
        }else{
            return false;
        }
    }

    advance(){//入力から現在のコマンドを読み、それを現在のコマンドとする。
        this.lineCounter = this.lineCounter + 1; //一点疑問なのだが、currentInstructionはlineCouterの更新で自動的に更新されるのか

        if(this.instructions[this.lineCounter]){ //最後のコマンドの場合存在しないものが発生するから、その場合にはこれは実行しないように設定する
            this.currentInstruction = this.instructions[this.lineCounter];

            if(this.currentInstruction.charAt(0) === "(" && this.currentInstruction.slice(-1) === ")"){
                this.l_com = this.l_com + 1;
            }
        }else{
            this.currentInstruction = null;
        }
    }

    commandType(){//現在のコマンドを返す。return currentCommandType　現在のコマンドのタイプを解析するのもここで問題ないな　外部から現在のコマンドを受け取って実行する
        if(this.currentInstruction !== null){
            if(this.currentInstruction.charAt(0) === "@"){
                return A_COMMAND;
            }else if(this.currentInstruction.charAt(0) === "(" && this.currentInstruction.slice(-1) === ")"){
                return L_COMMAND;
            }else{
                return C_COMMAND;
            }
        }
    }

    symbol(commandType){//a_commandもしくはl_commandの時に現在のコマンドを返すだけなのではないのか
        if(commandType === A_COMMAND){
            return this.currentInstruction.split("@")[1];
        }else if(commandType === L_COMMAND){
            let start = this.currentInstruction.indexOf("(");
            let end = this.currentInstruction.indexOf(")");
            return this.currentInstruction.slice(start+1,end);
        }
    }

    dest(){ //ここに関しての想定は、８パターンの文字列を返すものとする。ただし、今回一個のみにしか保存するパターンのアセンブリが用意されていなさそうなので、いずれか片方に保管するもしくは保管しないという４パターンのみしか用意していない
        if(this.currentInstruction.includes("=")){
            let dest = this.currentInstruction.split("=")[0];
            return dest;
        }else{
            return null;
        }
    }

    comp(){ //jump命令の場合は、";"の前の部分がcompの値となり、dest命令の場合は、"="の後の部分がcompの値となるはず
        if(this.currentInstruction.includes("=")){
            let comp = this.currentInstruction.split("=")[1];
            return comp;
        }else if(this.currentInstruction.includes(";")){
            let comp = this.currentInstruction.split(";")[0];
            return comp;
        }
    }

    jump(){ //ここに関しても８パターンの文字列を返す
        if(this.currentInstruction.includes(";")){
            let jump = this.currentInstruction.split(";")[1]; //これを実行すると、８パターンのいずれかが取得できる。
            return jump;
        }else{
            return null; //C命令かつ";"が含まれていない場合にも、jump命令の値を返す必要がある。そのため、値としてnullを返す。
        }
    }

}

module.exports = Parser;
//メソッドに関しては、外で呼び出すものになるはず
//コメントの削除もする必要があるけど、最初の行で置かれている場合と途中で置かれているものがある。
//ちなみに最終的に機械語を格納したテキストファイルを生成して、これを結果として返す。
