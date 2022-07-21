const fs = require("fs");

//ここでは直接的にアセンブリのコードへと変換し、それを書き込む必要がある。
class CodeWriter {
    constructor(outputPath){
        this.outputPath = outputPath;
        this.asm = []; //アセンブリ言語への変換ができたらここにpushしていく。
        this.label = 0;
    }

    setFileName(fileName){

    }

    writeArithmetic(command){ //現時点のコマンドで算術コマンドは完了
        let arith;
        this.pop_command();

        if(["not","neg"].includes(command)){
            //一変数関数を扱う
            this.asm.pop();

            //計算の実行
            switch(command){
                case "not":
                    arith = "D=!M"; 
                    break;
                case "neg":
                    arith = "D=-M"; 
                    break;
            }
            this.asm.push(arith);
            this.push_command();

        }else{
            //二変数関数を扱う
            this.pop_command();
            this.asm.pop();

            if(["add","sub","and","or"].includes(command)){
                //計算の実行
                switch(command){
                    case "add" :
                        arith = "D=D+M"
                        break;
                    case "sub" :
                        arith = "D=M-D"
                        break;
                    case "and" :
                        arith = "D=D&M";
                        break;
                    case "or" :
                        arith = "D=D|M";
                        break;
                }
                this.asm.push(arith);
                this.push_command();

            }else{
                let l1 = this.get_new_label();
                let l2 = this.get_new_label();
                let jump_command;

                switch(command){
                    case "eq" :
                        jump_command = "JEQ";
                        break;
                    case "gt" :
                        jump_command = "JGT";
                        break;
                    case "lt" :
                        jump_command = "JLT";
                        break;
                }

                let array = [
                    "D=M-D",
                    `@${l1}`,
                    `D;${jump_command}`,
                    "@SP",
                    "A=M",
                    "M=0",
                    "@SP",
                    "M=M+1",
                    `@${l2}`,
                    "0;JMP",
                    `(${l1})`,
                    "@SP",
                    "A=M",
                    "M=-1",
                    "@SP",
                    "M=M+1",
                    `(${l2})`
                ]


                array.forEach(arr => {
                    this.asm.push(arr);
                });
            }
        }
    }

    writePushPop(command,segment,index){ //pushコマンドとpopコマンドの扱いがセグメントによって異なるかもしれない
        //全てをアセンブリ言語に変換する。
        if(command === "C_PUSH"){
            //push命令の実行
            if(["constant"].includes(segment)){
                //セグメントがconstantの時の処理
                this.asm.push(`@${index}`,"D=A");
                this.push_command();
            }else if(["local","argument","this","that"].includes(segment)){
                //上記のセグメントの際の処理
                this.asm.push(`@${index}`,"D=A");
                this.v1_push_command(segment);
            }else if(["pointer","temp"].includes(segment)){
                this.asm.push(`@${index}`,"D=A");
                this.v2_push_command(segment,index);
            }else{
                this.v3_push_command(index);
            }

        }else{
            //pop命令の実行            
            if(["constant"].includes(segment)){
                //セグメントがconstantの時の処理
                this.pop_command();
            }else if(["local","argument","this","that"].includes(segment)){
                //上記のセグメントの際の処理
                this.asm.push(`@${index}`,"D=A");
                this.v1_pop_command(segment);
            }else if(["pointer","temp"].includes(segment)){
                this.v2_pop_command(segment,index);
            }else{
                this.v3_pop_command(index);
            }
        }
    }

    close(){
        //出力ファイルを閉じる。最後に行う
        fs.writeFileSync(this.outputPath,this.asm.join("\n"));
    }

    //自作メソッド（ラベルの付与を目的としている。）　修正はなるべくしないように
    get_new_label(){
        this.label = this.label + 1;
        return "LABEL" + this.label;
    }

    //push_command　修正はなるべくしないように
    push_command(){
        this.asm.push(
            "@SP",
            "A=M",
            "M=D",
            "@SP",
            "M=M+1"
        )
    }

    //pop_command　修正はなるべくしないように
    pop_command(){
        this.asm.push(
            "@SP",
            "AM=M-1", 
            "D=M"
        )
    }

    //segmentからレジスタへの変換
    get_register(segment,i){
        switch(segment){
            case "argument" :
                return "ARG";
            case "local" :
                return "LCL";
            case "this" :
                return "THIS";
            case "that" :
                return "THAT";
            case "pointer" :
                return `@R${3+parseInt(i)}`;
            case "temp" :
                return `@R${5+parseInt(i)}`;
        }
    }

    //segment ver1
    v1_push_command(segment){
        let register = this.get_register(segment,0);
        this.asm.push(
            `@${register}`,
            "A=M+D",
            "D=M"
        );
        this.push_command();
    };

    v1_pop_command(segment){
        let register = this.get_register(segment,0);
        this.asm.push(
            `@${register}`,
            "D=M+D",
            "@R13",
            "M=D"
        );
        this.pop_command();
        this.asm.push(
            "@R13",
            "A=M",
            "M=D"
        );
    }

    //segment ver2
    v2_push_command(segment,i){
        let register = this.get_register(segment,i);

        this.asm.push(
            register,
            "D=M"
        );
        this.push_command();
    }

    v2_pop_command(segment,i){
        let register = this.get_register(segment,i);

        this.pop_command();
        this.asm.push(
            register,
            "M=D"
        );
    }

    //segment ver3
    v3_push_command(index){
        this.asm.push(
            `@${parseInt(index) + 16}`,
            "D=M"
        );
        this.push_command();
    }

    v3_pop_command(index){
        this.pop_command();
        this.asm.push(
            `@${parseInt(index)+16}`,
            "M=D"
        )
    }

}

module.exports = CodeWriter;