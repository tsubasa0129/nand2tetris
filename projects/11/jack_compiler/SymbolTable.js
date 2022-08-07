class SymbolTable {
    constructor(){
        //配列に対して、オブジェクトを追加していく
        this.class_symbol_table = [];
        this.subroutine_symbol_table = [];

        //以下二つはstartSubroutineで初期化されない
        this.static_index = 0;
        this.field_index = 0;

        //以下二つはstartSubroutineで初期化される
        this.arg_index = 0;
        this.var_index = 0;
    }

    startSubroutine(){
        //subroutineの配列の中身を削除する
        this.subroutine_symbol_table.length = 0;

        //サブルーチンスコープのインデックス番号を初期化する
        this.arg_index = 0;
        this.var_index = 0;
    }

    /* 
        この時点で同名の変数があった際に
    */
    define(name,type,kind){
        //テーブルの雛形を作成
        let table = {
            name : name,
            type : type, //データ型
            kind : kind, //属性(var,fieldとか)
            index : 0
        }

        //基本的には単純なコマンドのみとなっているので、プログラムをもう少し単純化することができるのではないか
        switch(kind){
            case "STATIC":
                table.index = this.static_index;
                this.static_index++;

                //クラススコープへの追加
                this.class_symbol_table.push(table);
                break;
            case "FIELD":
                table.index = this.field_index;
                this.field_index++;

                //クラススコープへの追加
                this.class_symbol_table.push(table);
                break;
            case "ARG":
                table.index = this.arg_index;
                this.arg_index++;

                //サブルーチンスコープへの追加
                this.subroutine_symbol_table.push(table);
                break;
            case "VAR":
                table.index = this.var_index;
                this.var_index++;

                //サブルーチンスコープへの追加
                this.subroutine_symbol_table.push(table);
                break;
            default :
                //不正なtypeが入力されている
                throw new Error();
        }        
    
    }

    varCount(kind){

        //console.log(this.subroutine_symbol_table);
        switch(kind){
            case "STATIC":
                return this.static_index;
            case "FIELD":
                return this.field_index;
            case "ARG":
                return this.arg_index;
            case "VAR":
                return this.var_index;
            default :
                //不正なtypeが入力されている
                throw new Error();
        }
    }

    kindOf(name){
        //検索の優先順位を知る必要がある
        let symbol = this.searchSymbol(name);

        if(symbol === "NONE"){
            return symbol;
        }else{
            return symbol.kind;
        } 
    }

    typeOf(name){
        let symbol = this.searchSymbol(name);
        return symbol.type;
    }

    indexOf(name){
        let symbol = this.searchSymbol(name);
        return symbol.index;
    }

    searchSymbol(name){
        //subroutineからの検索
        let from_subroutine = this.subroutine_symbol_table.find(arr => {
            return arr.name === name;
        });

        //classからの検索
        let from_class = this.class_symbol_table.find(arr => {
            return arr.name === name;
        });

        if(from_subroutine !== undefined){
            return from_subroutine;
        }else if(from_class !== undefined){
            return from_class;
        }else{
            return "NONE";
        }
    }
}

module.exports = SymbolTable;