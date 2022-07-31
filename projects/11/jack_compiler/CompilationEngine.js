const fs = require("fs");
const JackTokenizer = require("./JackTokenizer");
const SymbolTable = require("./SymbolTable");

//classの定義の段階でこのtypeに対して、classnameを追加しなければならないのではないか？また、keywordにおいてもチェックが働くので追加する必要がある。というか二重でチェックする必要がないので、チェックする場合とそうでない場合とで分けるか
const primitive_type = ["INT","CHAR","BOOLEAN"];
const op = ["+","-","*","/","&","|","<",">","="];
const unaryop = ["-","~"];
const KeywordConstant = ["TRUE","FALSE","NULL","THIS"];

class CompilationEngine {
    constructor(input,output){
        this.SymbolTable = new SymbolTable();
        this.tokenizer = new JackTokenizer(input);
        this.output = output;

        //ネストの度合いを定義する
        this.nest_level = 0;

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

        this.execute_writing();
    }

    /* 
        機能:タグの生成を行い、トークンを更新する
    */
    execute_writing(){
        //tgtの変換
        switch(this.tgt_type){
            case "STRING_CONSTANT" :
                this.tgt_type = "stringConstant";
                this.tgt_token = this.tgt_token
                    .slice(1)
                    .slice(0,-1);
                break;
            case "INT_CONST" :
                this.tgt_type = "integerConstant";
                break;
            case "KEYWORD" :
                this.tgt_token = this.tgt_token.toLowerCase();
            default :
                this.tgt_type = this.tgt_type.toLowerCase();
                break;
        }

        //xmlに表示不可能な形式の変換
        if(this.tgt_token === "<"){
            this.tgt_token = "&lt;";
        }else if(this.tgt_token === ">"){
            this.tgt_token = "&gt;";
        }else if(this.tgt_token === "&"){
            this.tgt_token = "&amp;"
        }

        //タグの書き込み処理
        let tag = `<${this.tgt_type}> ${this.tgt_token} </${this.tgt_type}>`;
        this.write_tag(tag);

        this.updateToken();
    }

    /* 
        機能:XMLへの終端記号の書き込み処理を行う
    */
    write_tag(tag){
        fs.appendFileSync(this.output, "  ".repeat(this.nest_level) + tag + "\n");
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
        this.write_tag(`<${tagName}>`);
        this.nest_level++;

        switch(tagName){
            case "class" :
                this.compileClass();
                break;
            case "classVarDec" :
                this.compileClassVarDec();
                break;
            case "subroutineDec" :
                this.compileSubroutine();
                break;
            case "subroutineBody" :
                this.compileSubroutineBody();
                break;
            case "parameterList" :
                this.compileParameterList();
                break;
            case "varDec" :
                this.compileVarDec();
                break;
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
            case "term" :
                this.compileTerm();
                break;
            case "expressionList" :
                this.compileExpressionList();
                break;
            default :
                //詳細は存在しないメソッド
                throw new Error();
        }

        this.nest_level--;
        this.write_tag(`</${tagName}>`);
    }

    /* 
        ●クラスのコンパイルが可能
    */
    compileClass(){
        //class
        this.terminalToken_exe(null,null);

        //className
        this.write_className("REGIST",this.tgt_token);
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
                this.compile_container("classVarDec");
            }else if(["CONSTRUCTOR","FUNCTION","METHOD"].includes(this.tgt_token)){
                //subroutineDecの処理
                this.compile_container("subroutineDec");
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
        this.terminalToken_exe(null,null);

        //ここでsymbolTableへの追加を行いつつ、tokenの処理を進める
        this.add_symbolTable(kind);

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●subroutineDecのコンパイルを可能とする
    */
    compileSubroutine(){
        //('constructor' | 'function' | 'method')
        if(["CONSTRUCTOR","FUNCTION","METHOD"].includes(this.tgt_token)){
            this.terminalToken_exe(null,null);
        }else{
            //入力可能は'constructor' | 'function' | 'method'
            throw new Error();
        }

        //('void' | type)
        let addType = ["VOID"];
        this.getType_process(addType);

        /* subroutineNameの登録処置を行う */
        this.write_subroutineName("REGIST",this.tgt_token);
        this.updateToken();

        //"("
        this.terminalToken_exe("SYMBOL","(");

        //parameterList
        this.compile_container("parameterList");

        //")"
        this.terminalToken_exe("SYMBOL",")");

        //subroutineBodyの呼び出し
        this.compile_container("subroutineBody");
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
            this.compile_container("varDec");
        }

        //statementsを呼び出すのみ
        this.compile_container("statements");

        //"}"
        this.terminalToken_exe("SYMBOL","}");
    }

    /* 
        ●parameterListのコンパイルを可能とする(引数の箇所)
    */
    compileParameterList(){
        //まずは、primitiveとclassに分割して処理を行う        
        while(true){
            //引数が0個の場合
            if(this.tgt_token === ")"){
                break;
            }

            //typeの判定を行う。
            let type = this.tgt_token;
            this.getType_process();

            /* varName(引数の変数名)　*/
            let varName = this.tgt_token;

            this.judge_identifier();
            this.SymbolTable.define(varName,type,"ARG");
            this.write_varName("REGIST",this.tgt_token);
            this.updateToken();

            //symbolTableへの追加処理を行う
            this.SymbolTable.define(varName,type,"ARG");

            //","の有無の判定
            if(this.tgt_token === ","){
                this.terminalToken_exe(null,null);
            }else{
                break;
            }        
        }
    }

    /* 
        ●varDecのコンパイルを可能とする(ローカル変数の宣言の層)
    */
    compileVarDec(){
        //"var"
        this.terminalToken_exe(null,null);

        //呼び出し処理
        this.add_symbolTable("VAR");

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●Statementsのコンパイルを可能とする(statementが0回以上)
    */
    compileStatements(){
        //statementの呼び出し
        if(["LET","IF","WHILE","DO","RETURN"].includes(this.tgt_token)){
            while(true){
                if(this.tgt_token === "LET"){
                    this.compile_container("letStatement");
                }else if(this.tgt_token === "IF"){
                    this.compile_container("ifStatement");
                }else if(this.tgt_token === "WHILE"){
                    this.compile_container("whileStatement");
                }else if(this.tgt_token === "DO"){
                    this.compile_container("doStatement");
                }else if(this.tgt_token === "RETURN"){
                    this.compile_container("returnStatement");
                }else{
                    break;
                }
            }
        }
    }

    /* 
        doのコンパイルを可能とする
    */
    compileDo(){
        //"do"
        this.terminalToken_exe(null,null);

        //subroutineCall
        this.subroutineCall();

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●letのコンパイルを可能とする
    */
    compileLet(){        
        //"let"
        this.terminalToken_exe(null,null);

        //varName ①identifierかどうかの判定      
        if(this.tgt_type !== "IDENTIFIER"){
            //判定エラー
            throw new Error();
        }

        //②書き込みを行う 
        this.write_varName("USE",this.tgt_token);
        this.updateToken();

        //"["の判定を行い、必要なら[expression]を行う
        if(this.tgt_token === "["){
            this.array_container();
        }

        //"="
        this.terminalToken_exe("SYMBOL","=");

        //expression呼び出し
        this.compile_container("expression");

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        whileのコンパイルを可能とする
    */
    compileWhile(){
        //while
        this.terminalToken_exe(null,null);

        //(expression)
        this.expression_container();

        //{statements}
        this.block_container();
    }

    /* 
        ●returnのコンパイルを可能とする

        ●改善検討
        ・expression呼び出しが、0回もしくは1回なので、その柔軟性がexpressionにあるならば問題なしだけど、、、
    */
    compileReturn(){
        //return
        this.terminalToken_exe(null,null);

        if(this.tgt_token !== ";"){
            //expression呼び出し
            this.compile_container("expression");
        }

        //";"
        this.terminalToken_exe("SYMBOL",";");
    }

    /* 
        ●ifのコンパイルを可能とする
    */
    compileIf(){
        //if
        this.terminalToken_exe(null,null);

        //(expression)
        this.expression_container();

        //{statements}
        this.block_container();

        //elseの判定を行う
        if(this.tgt_token === "ELSE"){
            //else 
            this.terminalToken_exe(null,null);

            //{statements}
            this.block_container();
        }
    }

    /* 
        ●expressionのコンパイルを可能とする
    */
    compileExpression(){        
        let i = 0;
        while(true){
            if(i === 0){
                i++;
                this.compile_container("term");
            }

            //(op term)が0回以上
            if(op.includes(this.tgt_token)){
                //op
                this.terminalToken_exe(null,null);
                
                //term呼び出し
                this.compile_container("term");
            }else{
                break;
            }
        }
    }

    /* 
        ●termのコンパイルを可能とする

        ●改善検討
        ・unaryOpが二連続の場合コンパイルエラーにするべきかな.また再起として呼び出す場合にタグが二重化してしまうな
        ・identifierの処理を簡略化した。変数等の検索処理は未対応
    */
    compileTerm(){ //からの場合の対処を考えていない。
        /* termの処理記述(tgt_typeを使用しないでもいいかなとも考えている) */
        switch(this.tgt_type){
            case "SYMBOL" :
                if(unaryop.includes(this.tgt_token)){
                    //unaryop
                    this.terminalToken_exe(null,null);

                    //再帰還数
                    this.compile_container("term");
                    break;
                }else if(this.tgt_token === "("){
                    //(expression)
                    this.expression_container();
                    break;
                }else{
                    //SYMBOLのtermはunaryop termの形、もしくは(expression)の形でなければならない
                    throw new Error();
                }
            case "KEYWORD" :
                if(KeywordConstant.includes(this.tgt_token)){
                    //keywordConstant
                    this.terminalToken_exe(null,null);
                    break;
                }else{
                    //keywordConstant以外のkeywordを使用することができない
                    throw new Error();
                }
            case "STRING_CONSTANT" :
            case "INT_CONST" :
                this.terminalToken_exe(null,null);
                break;
            case "IDENTIFIER" : 
                //tokenを保管しておく
                let tmp_token = this.tgt_token;
                this.updateToken();

                //tokenの保管を行う
                if(this.tgt_token === "(" || this.tgt_token === "."){
                    //ここではidentifierの処理層に関してはここでは行わない
                    this.subroutineCall(tmp_token); //ここで登録処理を行えばいいのではないか
                }else{
                    //varNameの処理を行う
                    this.write_varName("USE",tmp_token);

                    if(this.tgt_token === "["){
                        //[expression]の処理を行う
                        this.array_container();
                    }
                }

                break;
            default :
                throw new Error();
        }
    }

    /* 
        ●expressionListのコンパイルを可能とする
    */
    compileExpressionList(){
        if(this.tgt_token !==  ")"){
            while(true){
                //expression呼び出し
                this.compile_container("expression");

                if(this.tgt_token === ","){
                    this.terminalToken_exe("SYMBOL",",");
                }else{
                    break;
                }
            }
        }
    }

    /* 以下、処置をまとめる際に利用する(そのため、containerを必要としない) */

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
        }

        //tokenの書き込み処理を行う必要がある

        if(this.tgt_token === "("){
            //subroutineNameの処理
            this.write_subroutineName("USE",token);

            this.terminalToken_exe("SYMBOL","(");
            this.compile_container("expressionList");
            this.terminalToken_exe("SYMBOL",")");
        }else if(this.tgt_token === "."){
            //varName|classNameの処理
            if(/[A-Z]/.test(token.charAt(0))){
                this.write_className("USE",token);
            }else{
                this.write_varName("USE",token);
            }

            this.terminalToken_exe("SYMBOL",".");
            this.write_subroutineName("USE",this.tgt_token);
            this.updateToken();
            this.terminalToken_exe("SYMBOL","(");
            this.compile_container("expressionList");
            this.terminalToken_exe("SYMBOL",")");
        }else{
            //"("か"."のみしか入らない
            throw new Error();
        }
        
    }

    /* 
        ●[expression]を行う
    */
    array_container(){
        //"["
        this.terminalToken_exe("SYMBOL","[");

        //expression呼び出し
        this.compile_container("expression");

        //"]"
        this.terminalToken_exe("SYMBOL","]");
    }

    /* 
        ●(expression)を行う
    */
    expression_container(){
        //"("
        this.terminalToken_exe("SYMBOL","(");

        //expression呼び出し
        this.compile_container("expression");

        //")"
        this.terminalToken_exe("SYMBOL",")");
    }

    /* 
        ●{statements}を行う
    */
    block_container(){
        //"{"
        this.terminalToken_exe("SYMBOL","{");

        //statements
        this.compile_container("statements");

        //"}"
        this.terminalToken_exe("SYMBOL","}");
    }

    /* 
        typeの処理を行う
    */
    getType_process(addType){
        //分離ver
        if(this.tgt_type === "KEYWORD"){
            let type = primitive_type;

            //addTypeっが存在する場合
            if(addType !== null){
                type = primitive_type.concat(addType);
            }

            if(!type.includes(this.tgt_token)){
                //使用不可能なkeywordが書かれている
                throw new Error();
            }
            this.terminalToken_exe(null,null);
        }else if(this.tgt_type === "IDENTIFIER"){
            /* 本来であれば、クラス名が存在するのかのテストが必要かも */
            this.terminalToken_exe(null,null);
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
        let i = 0;
        while(true){
            if(i % 2 === 0){
                i++;

                //処理内容としては、identifierかどうかの判定を行い、trueの場合はtokenを返す。falseの場合はthrow error
                let varName = this.judge_identifier();

                //OKなら登録を行う
                this.SymbolTable.define(varName,type,kind);
                //出力を行う処理
                this.write_varName("REGIST",this.tgt_token);
                this.updateToken();

                continue;
            }

            if(this.tgt_token === ","){
                i++;
                //","の実行
                this.terminalToken_exe(null,null);
            }else{
                break;
            }
        }
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
        opt : "REGIST" | "USE"
    */
    write_varName(opt,token){
        let kind = this.SymbolTable.kindOf(token);

        if(kind === "NONE"){
            //エラー処理
            throw new Error();
        }

        //tagの作成
        let index = this.SymbolTable.indexOf(token);
        let tagName = kind + "_" + opt + "_" + index;
        let tag = `<${tagName}>${token}</${tagName}>`;

        //tagを出力
        this.write_tag(tag);
    }

    /* 
        subroutine用 
        (引数)
        opt : "REGIST" | "USE"
    */
    write_subroutineName(opt,token){
        let tag = `<subroutine_${opt}>${token}</subroutine_${opt}>`;

        //tagの出力
        this.write_tag(tag);
    }

    /* 
        class用
        (引数)
        opt : "REGIST" | "USE"
    */
    write_className(opt,token){
        let tag = `<class_${opt}>${token}</class_${opt}>`;

        //tagの出力
        this.write_tag(tag);
    }

}

module.exports = CompilationEngine;

/* 
    このクラスの変更点
    ①SymobolTableモジュールを使用可能とする
    →変数登録処理と検索処理、そしてsubroutineの初期化を可能とする
    ②VMWriterの使用可能とする


    一応雛形はできたけど
    そして、classNameと　subroutineNameにも同様の処理を施す

    登録処理
    compileClass -
    検索等
    type,subroutineCall

    登録
    compileSubroutine -
    検索等
    doStatement,subroutineCall


    現段階の問題点
    ①classNameとsubroutineNameの記録をする箇所が存在しない
    ②コードの可読性が低い点
*/