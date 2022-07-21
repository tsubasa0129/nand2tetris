const fs = require("fs");
const Parser = require("./parser");
const CodeWriter = require("./CodeWriter");
const path = require("path");

const input = "../../09/HelloWorld";
const output = "../../09/HelloWorld/HelloWorld.asm";

// const input = "../FunctionCalls/SimpleFunction";
// const output = "../FunctionCalls/SimpleFunction/SimpleFunction2.asm";

//まずはファイルかディレクトリかの判定を行う
let isDirectory = fs.statSync(input).isDirectory();

let codeWriter = new CodeWriter(output);

if(isDirectory){

    fs.readdir(input,(err,files) => {
        //writeInitに関してはここで呼び出す必要がある。
        codeWriter.writeInit();

        files.forEach((file) => {
            if(file.split(".").pop() === "vm"){
                let cpath = path.join(input,file);
                parse(cpath);
            }
        });
    });

}else{
    parse(input);
}

function parse(file){    
    let parser = new Parser(file);
    codeWriter.setFileName(file);

    let i = 0;

    while(true){
        i++;
        if(parser.hasMoreCommands()){
            //この時次の処理を実行する.
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
                case "C_LABEL" :
                    codeWriter.writeLabel(arg1);
                    break;
                case "C_GOTO" :
                    codeWriter.writeGoto(arg1);
                    break;
                case "C_IF" :
                    codeWriter.writeIf(arg1);
                    break;
                case "C_FUNCTION" :
                    codeWriter.writeFunction(arg1,arg2);
                    break;
                case "C_RETURN" :
                    codeWriter.writeReturn();
                    break;
                case "C_CALL" :
                    codeWriter.writeCall(arg1,arg2);
                    break;
                default :
                    console.log("error in translater.js");
            }

            parser.advance();
        }else{
            break;
        }
    }

    codeWriter.close();
}