const fs = require("fs");

class VMWriter {
    constructor(output){
        //書き込み自体はVMWriter内で行うのが良いかも
        this.output = output;

        this.vm_op = [
            {op : "+",vm_op : "add"},
            {op : "-",vm_op : "sub"},
            {op : "*",vm_op : "call Math.multiply 2"},
            {op : "/",vm_op : "call Math.devide 2"},
            {op : "=",vm_op : "eq"},
            {op : ">",vm_op : "gt"},
            {op : "<",vm_op : "lt"},
            {op : "&",vm_op : "and"},
            {op : "|",vm_op : "or"},
            {op : "~",vm_op : "not"}
        ];
    }

    write_vmCode(vmCode){
        fs.appendFileSync(this.output , vmCode + "\n");
    }

    /* 
        イメージ的には変数利用の際に用いる　（push,pop共に）
    */
    writePush(Segment,Index){
        let vmCode = `push ${Segment} ${Index}`;
        this.write_vmCode(vmCode);
    }

    writePop(Segment,Index){
        let vmCode = `pop ${Segment} ${Index}`;
        this.write_vmCode(vmCode);
    }

    writeArithmetic(command,unary){
        this.write_vmCode(this.get_vm_op(command,unary));
    }

    writeLabel(label){

    }

    writeGoto(label){

    }

    writeIf(label){

    }

    writeCall(name,nArgs){
        let vmCode = `call ${name} ${nArgs}`;
        this.write_vmCode(vmCode);
    }

    /* 
        ●vmCode functionの生成を行う。
        (引数)
        name : クラス名.サブルーチン名を想定
        nLocals : 引数の数
    */
    writeFunction(name,nLocals){
        let vmCode = `function ${name} ${nLocals}`;
        this.write_vmCode(vmCode);
    }

    writeReturn(){
        this.write_vmCode("return");
    }

    close(){

    }

    /* 以下、オリジナルメソッド */
    get_vm_op(op,unary){
        if(unary === true && op === "-"){
            //符号反転の"-"の場合
            return "neg";
        }
        
        //その他の場合
        let vmCode = this.vm_op.find(arr => {
            return arr.op === op;
        });

        return vmCode.vm_op;
    }
}

module.exports = VMWriter;