const fs = require("fs");

class Parser {
    constructor(file){
        let fileData = fs.readFileSync(file,{encoding:"utf-8"});
        let array = fileData.split("\r\n"); //ここで改行、空行のスプリット化を行う。

        this.instructions = []; //配列として用意する。

        //まずはコメントと空白を削除する。（万が一途中にコメントがある場合にはそれをそれを削除した上で配列の中に組み込む）
        array.forEach(arr => {
            if(arr.includes("//") || !arr){
                //この時は基本的には配列に追加しない（ただしその例外を作る）
                let delComment = arr.split("//")[0];

                if(delComment !== ""){
                    this.instructions.push(arr);
                }
            }else{
                this.instructions.push(arr);
            }
        });

        console.log(this.instructions);

        //おそらくこの後でadvanceを作成する中で、現在のコマンドの位置（何行か削除してしまっているため、vmファイルの行数とはことなる）を把握する必要があるかも
        this.lineCounter = 0;
    }

    hasMoreCommands(){ //役割はアセンブラのと同様で、コマンドの個数上限との比較。ブール値を返す。
        return(this.lineCounter <= this.instructions.length - 1 ? true : false); //不完全
    }

    advance(){ //次のコマンドを使用する。
        this.lineCounter = this.lineCounter + 1; //これをどのタイミングで呼ぶかによって、処理の内容が変わってくる。例えば、後ろに置くのであれば、この状態でもOK
    }

    commandType(){ //returnでVMコマンドの種類を返す。
        var command = this.instructions[this.lineCounter];

        //ここでcommandを元に、コマンドの種類の分析を行う
        let commandArray = command.split(" ");
        let initial = commandArray[0];

        if(commandArray.length === 1){
            if(initial === "return"){
                return "C_RETURN";
            }else{
                return "C_ARITHMETIC";
            }
        }else if(commandArray.length === 2){
            if(initial === "label"){
                return "C_LABEL";
            }else if(initial === "goto"){
                return "C_GOTO";
            }else if(initial === "if-goto"){
                return "C_IF";
            }else{
                //ここではエラーの処理を行う。
            }
        }else if(commandArray.length === 3){
            if(initial === "push"){
                return "C_PUSH";
            }else if(initial === "pop"){
                return "C_POP";
            }else if(initial === "function"){
                return "C_FUNTION"
            }else if(initial === "call"){
                return "C_CALL";
            }else{
                //ここではエラー処置を行う。
            }
        }else{
            //ここではエラーの処理を実行する。
        }
    }

    arg1(){ //現コマンドの最初の引数を返す。ちなみにここを通る条件は、c_return以外の場合
        var command = this.instructions[this.lineCounter];
        let commandArray = command.split(" ");

        if(commandArray.length === 1){ //これ少し冗長になってしまうから、後で変えるかもしれない
            return commandArray[0];
        }else {
            return commandArray[1];
        }
    }

    arg2(){ //現コマンドの２番目の引数を返す。
        var command = this.instructions[this.lineCounter];
        let commandArray = command.split(" ");

        return commandArray[2];
    }
}

//やる順番としては、arg1とarg2の処理を完成させてしまい、その後でlineCounterの作成をする、

module.exports = Parser;