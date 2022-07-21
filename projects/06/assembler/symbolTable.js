class SymbolTable {
    constructor(){
        this.symbolTable = [
            {
                symbol : "SP",
                address : "0x0000"
            },
            {
                symbol : "LCL",
                address : "0x0001"
            },
            {
                symbol : "ARG",
                address : "0x0002"
            },
            {
                symbol : "THIS",
                address : "0x0003"
            },
            {
                symbol : "THAT",
                address : "0x0004"
            },
            {
                symbol : "R0",
                address : "0x0000"
            },
            {
                symbol : "R1",
                address : "0x0001"
            },
            {
                symbol : "R2",
                address : "0x0002"
            },
            {
                symbol : "R3",
                address : "0x0003"
            },
            {
                symbol : "R4",
                address : "0x0004"
            },
            {
                symbol : "R5",
                address : "0x0005"
            },
            {
                symbol : "R6",
                address : "0x0006"
            },
            {
                symbol : "R7",
                address : "0x0007"
            },
            {
                symbol : "R8",
                address : "0x0008"
            },
            {
                symbol : "R9",
                address : "0x0009"
            },
            {
                symbol : "R10",
                address : "0x000a"
            },
            {
                symbol : "R11",
                address : "0x000b"
            },
            {
                symbol : "R12",
                address : "0x000c"
            },
            {
                symbol : "R13",
                address : "0x000d"
            },
            {
                symbol : "R14",
                address : "0x000e"
            },
            {
                symbol : "R15",
                address : "0x000f"
            },
            {
                symbol : "SCREEN",
                address : "0x4000"
            },
            {
                symbol : "KBD",
                address : "0x6000"
            },
        ]; //後程、初期値としてレジスタ初期の値やキーボードやスクリーンのアドレスも格納
        this.num = 16;
    }

    addEntry(symbol,address){//シンボルとアドレスのペアを作成する。
        let obj;
        if(address === "new"){
            obj = {
                symbol : symbol,
                address : this.num
            };
            this.num = this.num + 1;
        }else{
            obj = {
                symbol : symbol,
                address : address
            };
        }

        this.symbolTable.push(obj);
    }

    contains(symbol){
        const result = this.symbolTable.find((arr) => arr.symbol === symbol);
        if(result){
            return true;
        }else{
            return false;
        }
    }

    getAddress(symbol){
        let result = this.symbolTable.find((arr) => arr.symbol === symbol);
        if(result){
            return result.address;
        }
    }
}

module.exports = SymbolTable;