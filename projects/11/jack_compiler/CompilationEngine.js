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

        //class名の初期化
        this.current_class = "";
        this.current_subroutineName = "";
        this.score = 0;

        //ここで次のトークンの呼び出しを行う
        this.updateToken(); 
    
        //jackでは最初はCLASSから書かれていなければならない。（エラー処理を追加する）
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

    /* container */
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
            case "parameterList" :
                this.compileParameterList();
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

        //classVarDec* subroutineDec*(クラス変数、subroutineの定義を行う)を呼び出す。
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
        let routineType = this.tgt_token;

        //('constructor' | 'function' | 'method')
        if(["CONSTRUCTOR","FUNCTION","METHOD"].includes(routineType)){
            this.updateToken();
        }else{
            //入力可能は'constructor' | 'function' | 'method'
            throw new Error();
        }

        //('void' | type) ここでは戻り値の型を取得している。これを記録し、subroutineBodyへと渡すのもありかもしれない
        let addType = ["VOID"];
        this.getType_process(addType);

        /* subroutineNameの登録処置を行う */
        let function_name = this.write_subroutineName("REGIST",this.tgt_token);

        //(parameterList)
        this.brackets_container(brackets.parentheses,"parameterList");
        
        /* subroutineBodyの処理 */
        
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

        //初期化が必要となる変数の数を取得する
        let varCount = this.SymbolTable.varCount("VAR");
        if(routineType === "METHOD"){
            varCount++;
        }

        //functionの書き込み処理を行う　例:function Main.main 0
        this.vmWriter.writeFunction(function_name,varCount);

        //statementsを呼び出すのみ
        this.compileStatements();

        //"}"
        this.terminalToken_exe("SYMBOL","}");
    }

    /* 
        ●parameterListのコンパイルを可能とする(引数の箇所)
    */
    compileParameterList(){
        //引数の個数を記録
        let i = 0;
        while(true){
            //引数が0個の場合
            if(this.tgt_token === ")"){
                break;
            }

            //typeの判定を行う。
            let type = this.tgt_token;
            this.getType_process();

            //varNameの登録処理
            this.compile_varName(type,"ARG");

            i++;

            //","の有無の判定
            if(this.tgt_token === ","){
                this.updateToken();
            }   
        }

        return i;
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

        //判定と書き込みを行う 
        this.judge_identifier();
        let varStore = this.write_varName(this.tgt_token); //本来であれば、結果をreturnして、最後にそれをもとに代入を行う
        this.updateToken();

        //"["の判定を行い、必要なら[expression]を行う(今回は扱わない)
        if(this.tgt_token === "["){
            this.brackets_container(brackets.square,"expression");
        }

        //"="
        this.terminalToken_exe("SYMBOL","=");

        //expression呼び出し
        this.compileExpression();

        //";"
        this.terminalToken_exe("SYMBOL",";");

        //最後に
        this.vmWriter.writePop(varStore.kind,varStore.index);
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
            this.compile_container("expression");

            //この際には戻り値を送る必要性がある

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

        ●改善検討
        ここに関しては未完ではある
    */
    compileTerm(){ //からの場合の対処を考えていない。
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
                //文字列を扱う必要があるけど、やり方は不明
            case "INT_CONST" :
                //これで一応数値への対策はOK
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
                    let varStore = this.write_varName(tmp_token); //varStoreが返却される

                    //とりあえずpushを行う。もし他の箇所でエラーが発生したら修正が必要になるけど
                    this.vmWriter.writePush(varStore.kind,varStore.index);

                    if(this.tgt_token === "["){
                        //[expression]の処理を行う
                        this.brackets_container(brackets.square,"expression");
                    }
                }
                break;

            default :
                throw new Error();
        }
    }

    //これはpush以外にもpopの可能性もあるかもしれない
    write_kc(token){
        console.log(token)
        switch(token){
            case "TRUE" :
                this.vmWriter.writePush("CONST",1);
                this.vmWriter.writeArithmetic("-",{unary : true});
                break;
            case "FALSE" :
            case "NULL" :
                this.vmWriter.writePush("CONST",0);
            case "THIS" :
                //不明
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
        変数の処理を無視

        ここに関しては、編集対象
    */
    subroutineCall(token){
        //className|varName　もしくはsubroutineNameが処理される
        if(token === undefined){
            token = this.tgt_token;
            this.updateToken();
        } //token内にidentifierが格納されている状態

        //tokenの書き込み処理を行う必要がある
        if(this.tgt_token === "("){
            //subroutineNameの処理
            this.write_subroutineName("USE",token);

            //(expressionList)
            this.brackets_container(brackets.parentheses,"expressionList");
        }else if(this.tgt_token === "."){
            let kind = this.SymbolTable.kindOf(token);
            if(kind === "NONE"){
                //classNameで確定する
            }else{
                //varNameで確定する
            }


            this.terminalToken_exe("SYMBOL",".");
            let call_name = token + "." + this.tgt_token;
            this.updateToken();

            //(expressionList)
            this.terminalToken_exe("SYMBOL","(");
            let arg_leng = this.compileExpressionList();
            this.terminalToken_exe("SYMBOL",")");

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
    getType_process(addType){
        if(this.tgt_type === "KEYWORD"){
            let type = primitive_type;

            //addTypeが存在する場合
            if(addType !== null){
                type = primitive_type.concat(addType);
            }

            if(!type.includes(this.tgt_token)){
                //使用不可能なkeywordが書かれている
                throw new Error();
            }
            this.updateToken();
        }else if(this.tgt_type === "IDENTIFIER"){
            /* 本来であれば、クラス名が存在するのかのテストが必要かも */
            this.updateToken();
        }else{
            //異なるtoken型
            throw new Error();
        }
    }

    /* 
        ●SymbolTableへの登録処理を行う。
    */
    add_symbolTable(kind){
        let type = this.tgt_type;
        this.getType_process();

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
        let varName = this.judge_identifier();
        this.SymbolTable.define(varName,type,kind);

        this.updateToken();
    }

    /* 
        if分節の中で、登録の際の重複確認を行う。（スコープについての意識も必須）
    */
    judge_identifier(){
        if(this.tgt_type === "IDENTIFIER"){
            return this.tgt_token;
        }

        throw new Error();
    }

    /* 
        varName
        (引数)
        token : 取得箇所によって、使用するトークンの位置関係が異なるので、使用するトークンを引数として用いる
    */
    write_varName(token){
        let varStore = {kind : "",index : ""};
        varStore.kind = this.SymbolTable.kindOf(token); //変数名から属性を取得している（var,argとか）

        if(varStore.kind === "NONE"){
            //エラー処理
            throw new Error();
        }

        //tagの作成
        varStore.index = this.SymbolTable.indexOf(token);

        //属性(ともしかしたらindexも必要になるかもしれない)
        return varStore;
    }

    /* 
        subroutine用 
        (引数)
        opt : "REGIST" | "USE"

        今のところある意味がなさそうだけど、今後使用する可能性がないわけではないので、一応残す
    */
    write_subroutineName(opt,token){
        if(opt === "REGIST"){
            this.current_subroutineName = token; 
            let function_name = this.current_class + "." + token;
            this.updateToken();
            return function_name;
        }else{
            this.updateToken();
        }
    }
}

module.exports = CompilationEngine;

/* 
    現段階の問題点
    ①classNameとsubroutineNameの記録をする箇所が存在しない
    ②コードの可読性が低い点
*/