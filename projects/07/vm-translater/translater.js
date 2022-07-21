//ここのメインではまずはm入力ファイルを受け取り解析をし、それをもとに分岐、結果を他のクラスに託す（結果はこちらに戻すかな）

const fs = require("fs");
const Parser = require("./parser");
const CodeWriter = require("./CodeWriter");
const path = require("path");

/* const input = "../StackArithmetic/StackTest/StackTest.vm";
const output = "../StackArithmetic/StackTest/StackTest.asm"; */

/* const input = "../StackArithmetic/SimpleAdd/SimpleAdd.vm";
const output = "../StackArithmetic/SimpleAdd/SimpleAdd.asm"; */

const input = "../MemoryAccess/BasicTest";
const output = "../MemoryAccess/BasicTest/BasicTest.asm";

/* const input = "../MemoryAccess/PointerTest/PointerTest.vm";
const output = "../MemoryAccess/PointerTest/PointerTest.asm"; */

/* const input = "../MemoryAccess/StaticTest/StaticTest.vm";
const output = "../MemoryAccess/StaticTest/StaticTest.asm"; */

//下記では、ファイルかディレクトリかの分岐を行う
/* fs.stat(input,(err,stat) => {
    if(err){
        console.log(err.message);
    }

    var isDir = stat.isDirectory();

    if(isDir){
        //ディレクトリの中身の分割をして、それの全てに対してparserを適用する必要性がある。さらに考慮しなければならない点として、拡張子を分析の対象にして、必要ないものは数える必要はない
        console.log("isDir");

        fs.readdir(input,(err,files) => {
            if(err){
                console.log(err.message);
            }

            files.forEach(file => {
                if(file.split(".").pop() === "asm"){
                    console.log(file);

                    //このとき、全てのファイルに対して、処理を実行できるようにする。候補としては、一旦格納して個数の把握を可能にする。その上で後で処理自体の実行をする。
                    //パースをするためにクラスの引数としてファイルを渡す。そしてその結果を受け取り、最終的に一つのファイルにまとめなければならないのか。

                }
            });

            //fileになるまでループを繰り返すようにしつつ、asmファイルを検索し、見つかった場合に配列に格納する

        });

        while(true){
            
        }

        //ここで次に実行することは、格納ファイルの中からvmファイルの個数を抽出　
    }else{
        //実行回数は一つで十分
        console.log("isFile");

        let parser = new Parser(input); //ここでコンストラクタを呼び出すので、解析自体はここでOK
        let codeWriter = new CodeWriter(output); //引数はまだ不明   

        while(true){
            if(parser.hasMoreCommands()){
                //この時次の処理を実行する。
                let commandType = parser.commandType();
                let arg1 = parser.arg1();
                let arg2 = parser.arg2();

                switch(commandType){
                    case "C_ARITHMETIC" :
                        codeWriter.writeArithmetic(arg1);
                        break;
                    case "C_PUSH" :
                    case "C_POP" :
                        codeWriter.writePushPop(commandType,arg1,arg2);
                        break;
                    default : //この上に他のコマンドの種類の追加が可能
                        console.log("error");
                }

                parser.advance(); //最後にインクリメントを行うことにより、次の処理を実行する。
            }else{
                break;
            }
        }

        codeWriter.close(); //最後の処理として実行する。（一応、closeというよりも書き込みを行なっている。）
    }
});
 */

//まずはファイルかディレクトリかの判定を行う
let isDirectory = fs.statSync(input).isDirectory();

if(isDirectory){
    fs.readdir(input,(err,files) => {
        files.forEach((file) => {
            if(file.split(".").pop() === "vm"){
                let cpath = path.join(input,file);
                console.log(cpath);

                parse(cpath);
            }
        });
    });

}else{
    parse(input);
}

function parse(file){
    let parser = new Parser(file); //ここでコンストラクタを呼び出すので、解析自体はここでOK
    let codeWriter = new CodeWriter(output); //引数はまだ不明   

    while(true){
        if(parser.hasMoreCommands()){
            //この時次の処理を実行する。
            let commandType = parser.commandType();
            let arg1 = parser.arg1();
            let arg2 = parser.arg2();

            switch(commandType){
                case "C_ARITHMETIC" :
                    codeWriter.writeArithmetic(arg1);
                    break;
                case "C_PUSH" :
                case "C_POP" :
                    codeWriter.writePushPop(commandType,arg1,arg2);
                    break;
                default : //この上に他のコマンドの種類の追加が可能
                    console.log("error");
            }

            parser.advance(); //最後にインクリメントを行うことにより、次の処理を実行する。
        }else{
            break;
        }
    }

    codeWriter.close();
}