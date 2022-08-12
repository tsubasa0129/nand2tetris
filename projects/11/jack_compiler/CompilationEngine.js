const JackTokenizer = require("./JackTokenizer");
const SymbolTable = require("./SymbolTable");
const VMWriter = require("./VMWriter");

//classの定義の段階でこのtypeに対して、classnameを追加しなければならないのではないか？また、keywordにおいてもチェックが働くので追加する必要がある。というか二重でチェックする必要がないので、チェックする場合とそうでない場合とで分けるか
const primitive_type = ["INT","CHAR","BOOLEAN"];
const op = ["+","-","*","/","&","|","<",">","="];
const unaryop = ["-","~"];
const KeywordConstant = ["TRUE","FALSE","NULL","THIS"];

const brackets = {parentheses : ["(",")"],square : ["[","]"],curly : ["{","}"]};

class CompilationEngine {
    constructor(input,output){
        this.SymbolTable = new SymbolTable();
        this.tokenizer = new JackTokenizer(input);
        this.vmWriter = new VMWriter(output);

        //初期化
        this.current_class = "";
        this.current_subroutineName = "";
        this.current_subroutineKind = "";
        this.score = 0;

        //ここで次のトークンの呼び出しを行う
        this.updateToken(); 
    
        //jackでは最初はCLASSから書かれていなければならない
        if(this.tgt_token === "CLASS"){
            this.compileClass();
        }
    }

    /* 
        機能:引数と現在のtokenが一致しているかを確認
    */
    terminalToken_exe(assumed_type,assumed_token){
        if(assumed_token !== null && assumed_token !== this.tgt_token){
            throw new Error("コンパイルエラー発生要件");
        }else if(assumed_type !== null && assumed_type !== this.tgt_type){
            throw new Error("コンパイルエラー発生要件②");
        }

        this.updateToken();
    }

    //next_tokenを読み込んだ際に、token情報の更新を行う
    updateToken(){
        if(!this.tokenizer.hasMoreTokens()){
            return;
        }

        //処理を一つ前に進める
        this.tokenizer.advance();

        //token_typeの更新を行う
        this.tgt_type = this.tokenizer.tokenType();

        //tokenの中身の更新を行う
        switch(this.tgt_type){
            case "SYMBOL" :
                this.tgt_token = this.tokenizer.symbol();
                break;
            case "KEYWORD" :
                this.tgt_token = this.tokenizer.keyWord();
                break;
            case "STRING_CONSTANT" :
                this.tgt_token = this.tokenizer.StringVal();
                break;
            case "INT_CONST" :
                this.tgt_token = this.tokenizer.intVal();
                break;
            case "IDENTIFIER" :
                this.tgt_token = this.tokenizer.identifier();
                break;
            default :
                throw new Error();
        }
    }

    /* 
        container
        ここに関しては、なるべく減らしていくことを想定している
    */
    compile_container(tagName){
        switch(tagName){
            case "statements" :
                this.compileStatements();
                break;
            case "doStatement" :
                this.compileDo();
                break;
            case "letStatement" :
                this.compileLet();
                break;
            case "whileStatement" :
                this.compileWhile();
                break;
            case "returnStatement" :
                this.compileReturn();
                break;
            case "ifStatement" :
                this.compileIf();
                break;
            case "expression" :
                this.compileExpression();
                break;
            case "expressionList" :
                this.compileExpressionList();
                break;
            default :
                //詳細は存在しないメソッド
                throw new Error();
        }
    }

    /* 
        ●クラスのコンパイルが可能
    */
    compileClass(){
        //class
        this.updateToken();

        //className
        this.current_class = this.tgt_token;
        this.updateToken();

        //"{"
        this.terminalToken_exe("SYMBOL","{")

        //classVarDec* subroutineDec*
        while(true){
            if(this.tgt_token === "}"){
                this.terminalToken_exe("SYMBOL","}");
                break;
            }

            if(["STATIC","FIELD"].includes(this.tgt_token)){
                //classVarDecの処理
                this.compileClassVarDec();
            }else if(["CONSTRUCTOR","FUNCTION","METHOD"].includes(this.tgt_token)){
                //subroutineDecの処理
                this.compileSubroutine();
            }else{
                //エラー処理
                throw new Error("コンパイルエラー発生要因");
            }
        }
    }

    /* 
        ●classVarDecのコンパイルを可能とする
    */
    compileClassVarDec(){        
        //("STATIC","FIELD")
        let kind = this.tgt_token;
        this.updateToken();

        //ここでsymbolTableへの追加を行いつつ、tokenの処理を進める
        this.add_symbolTable(kind);

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●subroutineDecのコンパイルを可能とする
    */
    compileSubroutine(){
        this.score = 0;
        this.SymbolTable.startSubroutine();

        this.current_subroutineKind = this.tgt_token;
        this.updateToken();

        //('void' | type) ここでは戻り値の型を取得している。これを記録し、subroutineBodyへと渡すのもありかもしれない
        this.getType(["VOID"]);

        /* subroutineNameの登録処置を行う */
        this.current_subroutineName = this.tgt_token; 
        this.updateToken();

        //(parameterList)
        this.terminalToken_exe("SYMBOL","(");
        this.compileParameterList();
        this.terminalToken_exe("SYMBOL",")");
        
        this.compileSubroutineBody();    
    }

    compileSubroutineBody(){
        //"{" 
        this.terminalToken_exe("SYMBOL","{");

        //varDecの呼び出し(複数回)
        while(true){
            if(this.tgt_token !== "VAR"){
                break;
            }
            //varDec呼び出し
            this.compileVarDec();
        }

        //function_nameの書き込みを行う　arg1 className.subroutineName arg2 varCount
        let function_name = this.current_class + "." + this.current_subroutineName;
        let varCount = this.SymbolTable.varCount("VAR");
        this.vmWriter.writeFunction(function_name,varCount);

        if(this.current_subroutineKind === "CONSTRUCTOR"){
            //メモリの割り当てを行う
            let index = this.SymbolTable.varCount("FIELD");
            this.vmWriter.writePush("CONST",index);
            this.vmWriter.writeCall("Memory.alloc",1);
            this.vmWriter.writePop("POINTER",0);
        }else if(this.current_subroutineKind === "METHOD"){
            //thisセグメントのベースを正しく設定する(引数からデータを奪い、pointer 0に割り当てる)
            this.vmWriter.writePush("ARG",0);
            this.vmWriter.writePop("POINTER",0);
        }

        //statementsを呼び出すのみ
        this.compileStatements();

        //"}"
        this.terminalToken_exe("SYMBOL","}");
    }

    /* 
        ●parameterListのコンパイルを可能とする(引数の箇所)
    */
    compileParameterList(){
        while(true){
            //引数が0個の場合
            if(this.tgt_token === ")"){
                break;
            }

            //typeの判定を行う。
            let type = this.getType();

            //varNameの登録処理
            this.compile_varName(type,"ARG");

            //","の有無の判定
            if(this.tgt_token === ","){
                this.updateToken();
            }   
        }
    }

    /* 
        ●varDecのコンパイルを可能とする(ローカル変数の宣言の層)
    */
    compileVarDec(){
        //"var"
        this.updateToken();

        //シンボルテーブルへの追加処理
        this.add_symbolTable("VAR");

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●Statementsのコンパイルを可能とする(statementが0回以上)
    */
    compileStatements(){
        while(true){
            if(["LET","IF","WHILE","DO","RETURN"].includes(this.tgt_token)){
                let tag = this.tgt_token.toLowerCase() + "Statement";
                this.compile_container(tag);

                continue;
            }
            break;
        }
    }

    /* 
        doのコンパイルを可能とする
    */
    compileDo(){
        //"do"
        this.updateToken();

        //subroutineCall
        this.subroutineCall();

        //この中でpop temp 0を行う
        this.vmWriter.writePop("TEMP",0);

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●letのコンパイルを可能とする
    */
    compileLet(){        
        //"let"
        this.updateToken();

        //書き込みを行う 
        let varStore = this.write_varName(this.tgt_token);
        this.updateToken();

        if(this.tgt_token === "["){
            this.vmWriter.writePush(varStore.kind,varStore.index);

            //[expression] expressionをpushすることを想定している
            this.terminalToken_exe("SYMBOL","[");
            this.compileExpression();
            this.terminalToken_exe("SYMBOL","]");

            //add
            this.vmWriter.writeArithmetic("+",{unary : false});

            //pop pointer 1
            this.vmWriter.writePop("TEMP",1);

            //"="
            this.terminalToken_exe("SYMBOL","=");

            //expression呼び出し
            this.compileExpression();

            //サンプルでは一時領域への保管をしていたので...
            this.vmWriter.writePush("TEMP",1);
            this.vmWriter.writePop("POINTER",1);
            this.vmWriter.writePop("THAT",0);

            //";"
            this.terminalToken_exe("SYMBOL",";");
        }else{
            //"="
            this.terminalToken_exe("SYMBOL","=");

            //expression呼び出し
            this.compileExpression();

            //";"
            this.terminalToken_exe("SYMBOL",";");

            //最後に
            this.vmWriter.writePop(varStore.kind,varStore.index);
        }
    }

    /* 
        whileのコンパイルを可能とする
    */
    compileWhile(){
        //ラベルの作成を行う
        let L1 = this.create_label("while.loop");
        let L2 = this.create_label("while.exit");

        //vmCodeの書き込みを行う
        this.vmWriter.writeLabel(L1);

        //while
        this.updateToken();

        //(expression) これが分岐の条件になっているはず
        this.brackets_container(brackets.parentheses,"expression");

        //反転を行う
        this.vmWriter.writeArithmetic("~",{unary : true});
        this.vmWriter.writeIf(L2);

        //{statements} 
        this.brackets_container(brackets.curly,"statements");
        this.vmWriter.writeGoto(L1);

        //ラベルを作成する
        this.vmWriter.writeLabel(L2);
    }

    create_label(place){
        let label = `${place}.${this.current_subroutineName}.${this.current_class}${this.score}`;
        this.score++;

        return label;
    }

    /* 
        ●returnのコンパイルを可能とする
    */
    compileReturn(){
        //return
        this.updateToken();

        if(this.tgt_token !== ";"){
            //expression呼び出し
            this.compileExpression();
        }else{
            //戻り値がないので0を返す
            this.vmWriter.writePush("CONST",0);
        }

        //returnコマンドの記入
        this.vmWriter.writeReturn();

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●ifのコンパイルを可能とする
    */
    compileIf(){
        //ラベルの作成
        let L1 = this.create_label("if.false");
        let L2 = this.create_label("if-true");

        //if
        this.updateToken();

        //(expression)
        this.brackets_container(brackets.parentheses,"expression");

        //結果の反転を行う
        this.vmWriter.writeArithmetic("~",{unary : true});

        //if-gotoコマンドの実装
        this.vmWriter.writeIf(L1);

        //{statements}
        this.brackets_container(brackets.curly,"statements");
        
        //gotoコマンドの実装
        this.vmWriter.writeGoto(L2);

        //計算処理の前にラベルを付与
        this.vmWriter.writeLabel(L1);

        //elseの判定を行う
        if(this.tgt_token === "ELSE"){
            //else 
            this.updateToken();

            //{statements}
            this.brackets_container(brackets.curly,"statements");
        }

        //ラベルの付与
        this.vmWriter.writeLabel(L2);
    }

    /* 
        ●expressionのコンパイルを可能とする
    */
    compileExpression(){        
        //termの呼び出し
        this.compileTerm();

        while(true){
            if(!op.includes(this.tgt_token)){
                break;
            }
            //op
            let current_op = this.tgt_token;
            this.updateToken();

            this.compileTerm();

            //opの出力をするべき
            this.vmWriter.writeArithmetic(current_op,{unary : false});
        }
    }

    /* 
        ●termのコンパイルを可能とする
    */
    compileTerm(){
        switch(this.tgt_type){
            case "SYMBOL" :
                if(unaryop.includes(this.tgt_token)){
                    let token = this.tgt_token;
                    this.updateToken();

                    //再帰還数
                    this.compileTerm();

                    //unaryop
                    this.vmWriter.writeArithmetic(token,{unary : true});
                    break;
                }else if(this.tgt_token === "("){
                    //(expression)
                    this.brackets_container(brackets.parentheses,"expression");
                    break;
                }else{
                    //SYMBOLのtermはunaryop termの形、もしくは(expression)の形でなければならない
                    throw new Error();
                }
            case "KEYWORD" :
                if(KeywordConstant.includes(this.tgt_token)){
                    //keywordConstant 今回はここに該当する
                    this.write_kc(this.tgt_token);

                    this.updateToken();
                    break;
                }else{
                    //keywordConstant以外のkeywordを使用することができない
                    throw new Error();
                }
            case "STRING_CONSTANT" :
                //文字列のコンパイルを行う(StringのAPIを用いる)
                let str_const = this.tgt_token.split("\"")[1];
                let length = str_const.length;

                //文字列の長さをpushする
                this.vmWriter.writePush("CONST",length);
                this.vmWriter.writeCall("String.new",1);

                var encoder = new TextEncoder('utf-8');

                let i = 0;
                while(i < length){
                    let text = str_const.charAt(i);
                    let strCode = encoder.encode(text)[0];
                    this.vmWriter.writePush("CONST",strCode);
                    this.vmWriter.writeCall("String.appendChar",2);
                    i++;
                }
                this.updateToken();
                break;
            case "INT_CONST" :
                //termが数値の場合
                this.vmWriter.writePush("CONST",this.tgt_token);
                this.updateToken();
                break;
            case "IDENTIFIER" : 
                //tokenを保管しておく
                let tmp_token = this.tgt_token;
                this.updateToken();

                //tokenの保管を行う
                if(this.tgt_token === "(" || this.tgt_token === "."){
                    //ここではidentifierの処理層に関してはここでは行わない
                    this.subroutineCall(tmp_token);
                }else{
                    //varNameの処理を行う
                    let varStore = this.write_varName(tmp_token);

                    this.vmWriter.writePush(varStore.kind,varStore.index);

                    if(this.tgt_token === "["){
                        //[expression]の処理を行う
                        this.brackets_container(brackets.square,"expression");

                        this.vmWriter.writeArithmetic("+",{unary : false});
                        this.vmWriter.writePop("POINTER",1);
                        this.vmWriter.writePush("THAT",0);
                    }
                }
                break;

            default :
                throw new Error();
        }
    }

    //これはpush以外にもpopの可能性もあるかもしれない
    write_kc(token){
        switch(token){
            case "TRUE" :
                this.vmWriter.writePush("CONST",1);
                this.vmWriter.writeArithmetic("-",{unary : true});
                break;
            case "FALSE" :
            case "NULL" :
                this.vmWriter.writePush("CONST",0);
                break;
            case "THIS" :
                this.vmWriter.writePush("POINTER",0);
                break;
        }
    }

    /* 
        ●expressionListのコンパイルを可能とする
        ここは引数ということのみを考えるので、この段階では計算等への関与はしない
    */
    compileExpressionList(){
        let i = 0;
        if(this.tgt_token !==  ")"){
            while(true){
                //expression呼び出し
                this.compileExpression();
                i++;

                if(this.tgt_token === ","){
                    this.terminalToken_exe("SYMBOL",",");
                }else{
                    break;
                }
            }
        }
        return i;
    }

    /* 
        インスタンス変数であるということを認識している必要があるのではないか
    */
    subroutineCall(token){
        //className|varName　もしくはsubroutineNameが処理される
        if(token === undefined){
            token = this.tgt_token;
            this.updateToken();
        }

        //tokenの書き込み処理を行う必要がある
        if(this.tgt_token === "("){
            //this.write_subroutineName("USE",token); 今後これを使うかもしれない
            let function_name = this.current_class + "." + token;

            //ここで引数への対応(一個目を行う) そのままスタックに入れればいい
            this.vmWriter.writePush("POINTER",0);

            //(expressionList)
            this.terminalToken_exe("SYMBOL","(");
            let arg_leng = this.compileExpressionList() + 1; //メソッドのなので+1の引数を持つ
            this.terminalToken_exe("SYMBOL",")");

            //call
            this.vmWriter.writeCall(function_name,arg_leng);

        }else if(this.tgt_token === "."){

            //以下の処理はまとめる事ができそうなので、後ほど
            let kind = this.SymbolTable.kindOf(token);
            let call_name;

            if(kind !== "NONE"){
                //varName.methodName(); ここではメソッドの処理を行う　ついでに引数の個数を増やす必要がある
                let index = this.SymbolTable.indexOf(token);
                let className = this.SymbolTable.typeOf(token);

                if(this.current_subroutineKind === "METHOD" && kind === "ARG"){
                    index++;
                }

                this.vmWriter.writePush(kind,index);

                this.terminalToken_exe("SYMBOL",".");
                call_name = className + "." + this.tgt_token;
            }else{
                //className.functionname ここではfunctionの処理を行う
                this.terminalToken_exe("SYMBOL",".");
                call_name = token + "." + this.tgt_token;
            }
            this.updateToken();

            //(expressionList)
            this.terminalToken_exe("SYMBOL","(");
            let arg_leng = this.compileExpressionList();
            this.terminalToken_exe("SYMBOL",")");

            if(kind !== "NONE"){
                arg_leng++;
            }

            //expressionListの処理が終了後callを行う
            this.vmWriter.writeCall(call_name,arg_leng);
        }else{
            //"("か"."のみしか入らない
            throw new Error();
        }
    }

    /* 
        bracketで囲まれたtagの処理を行う
        例：　(expression) 等
    */
    brackets_container(bracketsType,tag){
        //brackets_start
        this.terminalToken_exe("SYMBOL",bracketsType[0]);

        //tag呼び出し
        this.compile_container(tag);

        //brackets_end
        this.terminalToken_exe("SYMBOL",bracketsType[1]);
    }

    /* 
        typeの処理を行う
    */
    getType(addType){
        //データ型(クラスを含む)が格納される
        let type = this.tgt_token;

        switch(this.tgt_type){
            case "KEYWORD" :
                let type_array = primitive_type.concat(addType);
                if(!type_array.includes(type)){
                    throw new Error();
                }
            case "IDENTIFIER" :
                this.updateToken();
                return type;
            default :
                throw new Error();
        }
    }

    /* 
        ●SymbolTableへの登録処理を行う。
    */
    add_symbolTable(kind){
        let type = this.getType();

        /* varName (',' varName)* の処理 (これも複数回出現) */
        this.compile_varName(type,kind);

        while(true){
            if(this.tgt_token !== ","){
                break;
            }
            //","の実行
            this.terminalToken_exe("SYMBOL",",");
            this.compile_varName(type,kind);
        }
    }

    /* シンボルテーブルへの登録を行う */
    compile_varName(type,kind){
        this.SymbolTable.define(this.tgt_token,type,kind);
        this.updateToken();
    }

    /* 
        varName
        (引数)
        token : 取得箇所によって、使用するトークンの位置関係が異なるので、使用するトークンを引数として用いる
    */
    write_varName(token){
        let kind = this.SymbolTable.kindOf(token);
        
        if(kind === "NONE"){
            throw new Error();
        }

        let index = this.SymbolTable.indexOf(token);
        if(this.current_subroutineKind === "METHOD" && kind === "ARG"){
            index++;
        }

        return {kind : kind,index : index};
    }
}

module.exports = CompilationEngine;