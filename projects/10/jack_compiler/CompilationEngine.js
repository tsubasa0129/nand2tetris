const fs = require("fs");
const JackTokenizer = require("./JackTokenizer");

//classの定義の段階でこのtypeに対して、classnameを追加しなければならないのではないか？また、keywordにおいてもチェックが働くので追加する必要がある。というか二重でチェックする必要がないので、チェックする場合とそうでない場合とで分けるか
const primitive_type = ["INT","CHAR","BOOLEAN"];
const op = ["+","-","*","/","&","|","<",">","="];
const unaryop = ["-","~"];
const KeywordConstant = ["TRUE","FALSE","NULL","THIS"];

/* 
    使用する際は、①スコープの意識、②同名の禁止
*/
const varName = [];
const subroutineName = [];
const className = [];//ここに関しては、uppercaseを想定していない（最初のみ大文字）

class CompilationEngine {
    constructor(input,output){
        this.tokenizer = new JackTokenizer(input);
        this.output = output;

        //ネストの度合いを定義する
        this.nest_level = 0;

        //ここで次のトークンの呼び出しを行う
        if(this.tokenizer.hasMoreTokens()){
            this.tokenizer.advance();
        }

        //以下二つのクラス変数は、advanceで更新をかける
        this.tgt_type = this.tokenizer.tokenType();
        this.tgt_token = "";
    
        //jackでは最初はCLASSから書かれていなければならない。（エラー処理を追加する）
        if(this.tgt_type === "KEYWORD" && this.tokenizer.keyWord() === "CLASS"){
            this.tgt_token = "CLASS";
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
        //tgt_typeの小文字化
        let lower_tgt_type = this.tgt_type.toLowerCase();

        //keywordは小文字に直す必要がある
        if(this.tgt_type === "KEYWORD"){
            this.tgt_token = this.tgt_token.toLowerCase();
        }

        //タグの書き込み処理
        let tag = `<${lower_tgt_type}>${this.tgt_token}</${lower_tgt_type}>`;
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

    /* 
        ●クラスのコンパイルが可能

        ●改善検討
        ・classNameの登録処理は一旦無視
    */
    compileClass(){
        this.write_tag("<class>");
        this.nest_level++;

        //class
        this.terminalToken_exe(null,null);

        //className
        this.terminalToken_exe("IDENTIFIER",null);

        //"}"
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

        this.nest_level--;
        this.write_tag("</class>");
    }

    /* 
        ●classVarDecのコンパイルを可能とする

        ●改善検討
        ・varNameの登録処理を一旦無視
    */
    compileClassVarDec(){        
        this.write_tag("<classVarDec>");
        this.nest_level++;

        //("STATIC","FIELD")
        this.terminalToken_exe(null,null);

        /* typeの判定を行う層(他にも絶対に使用するのでまとめることは可能だな) */
        this.getType_process();

        /* varName (',' varName)* の処理 (これも複数回出現) */
        let i = 0;
        do {
            if(i % 2 === 0){
                //ここでは、変数の登録処理を行う（ただし、identiferのみ）
                this.terminalToken_exe("IDENTIFIER",null);

                i++;
                continue;
            }

            //i % 2 === 1 の処理
            if(this.tgt_token === ","){
                //","の実行
                this.terminalToken_exe(null,null);

                i++;
            }else{
                break;
            }

        }while(true);

        //";"
        this.terminalToken_exe("SYMBOL",";");

        this.nest_level--;
        this.write_tag("</classVarDec>");
    }

    /* 
        ●subroutineDecのコンパイルを可能とする

        ●改善検討
        ・本来的にはエラーを検出する際には、具体的な情報を知る必要性があるため、具体的な判定を行いその結果を出力する必要があるのではないか
        ・subroutineNameの登録処理は一旦無視
    */
    compileSubroutine(){
        this.write_tag("<subroutineDec>");
        this.nest_level++;

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
        this.terminalToken_exe("IDENTIFIER",null);

        //"("
        this.terminalToken_exe("SYMBOL","(");

        //parameterList
        this.compileParameterList();

        //")"
        this.terminalToken_exe("SYMBOL",")");

        //subroutineBodyの呼び出し
        this.compileSubroutineBody();

        this.nest_level--;
        this.write_tag("</subroutineDec>");
    }

    compileSubroutineBody(){
        this.write_tag("<subroutineBody>");
        this.nest_level++;

        //"{" 
        this.terminalToken_exe("SYMBOL","{");

        //varDecの呼び出し(複数回)
        while(true){
            if(this.tgt_token !== "VAR"){
                break;
            }
            //varDec呼び出し
            this.compileClassVarDec();
        }

        //statementsを呼び出すのみ
        this.compileStatements();

        //"}"
        this.terminalToken_exe("SYMBOL","}");

        this.nest_level--;
        this.write_tag("</subroutineBody>");
    }

    /* 
        ●parameterListのコンパイルを可能とする(引数の箇所)

        ●改善検討
        ・引数の登録処理は一旦無視
        ・正直可読性が高いとは言えない
    */
    compileParameterList(){
        //まずは、primitiveとclassに分割して処理を行う
        this.write_tag("<parameterList>");
        this.nest_level++;
        
        while(true){
            //引数が0個の場合
            if(this.tgt_token === ")"){
                break;
            }

            //typeの判定を行う。
            this.getType_process();

            /* varName(引数の変数名) 登録 varNameが来なかった場合にはエラーが発生する　*/
            this.terminalToken_exe("IDENTIFIER",null);

            //","の有無の判定
            if(this.tgt_token === ","){
                this.terminalToken_exe(null,null);
            }else{
                break;
            }        
        }

        this.nest_level--;
        this.write_tag("</parameterList>");
    }

    /* 
        ●varDecのコンパイルを可能とする(ローカル変数の宣言の層)

        ●改善検討
        ・ローカル変数の登録処理を一旦無視　
        想定としては、登録可能かのチェック（同名が存在しないか）をして、ローカル変数への登録処理、XMLへの出力処理を行う
    */
    compileVarDec(){
        this.write_tag("<varDec>");
        this.nest_level++;

        //"var"
        this.terminalToken_exe(null,null);

        //typeの判定を行う。
        this.getType_process();

        //varNameは1回以上
        while(true){
            /* varName(ローカル変数) */
            this.terminalToken_exe("IDENTIFIER",null);

           //","の有無の判定
           if(this.tgt_token === ","){
                this.terminalToken_exe(null,null);
            }else{
                break;
            }
        }

        this.write_tag("</varDec>");
        this.nest_level--;
    }

    //ここからその他のstatementを呼び出すのか 
    /* 
        ●Statementsのコンパイルを可能とする(statementが0回以上)

        ●改善検討
    */
    compileStatements(){
        this.write_tag("<statements>");
        this.nest_level++;

        //statementの呼び出し
        if(["LET","IF","WHILE","DO","RETURN"].includes(this.tgt_token)){
            while(true){
                if(this.tgt_token === "LET"){
                    this.compileLet();
                }else if(this.tgt_token === "IF"){
                    this.compileIf();
                }else if(this.tgt_token === "WHILE"){
                    this.compileWhile();
                }else if(this.tgt_token === "DO"){
                    this.compileDo();
                }else if(this.tgt_token === "RETURN"){
                    this.compileReturn();
                }else{
                    break;
                }
            }
        }
        
        this.nest_level--;
        this.write_tag("</statements>");
    }

    /* 
        doのコンパイルを可能とする
    */
    compileDo(){
        this.write_tag("<doStatement>");
        this.nest_level++;

        //"do"
        this.terminalToken_exe(null,null);

        //subroutineCall
        this.subroutineCall();

        //";"
        this.terminalToken_exe("SYMBOL",";");

        this.nest_level--;
        this.write_tag("</doStatement>");
    }

    /* 
        ●letのコンパイルを可能とする

        ●改善検討
        ・varNameについての処理　一旦検索処理を解除する。(どこから読み込まれるのかが不明なため)
    */
    compileLet(){
        this.write_tag("<letStatement>");
        this.nest_level++;
        
        //"let"
        this.terminalToken_exe(null,null);

        //varName(登録されているはずなので代入処理を行う)
        this.terminalToken_exe("IDENTIFIER",null);

        //"["の判定を行い、必要なら処理を行う
        if(this.tgt_token === "["){
            //"["
            this.terminalToken_exe(null,null); //判定不要だけど。。。シンボルは基本判定しているしな

            //expression
            this.compileExpression();

            //"]"
            this.terminalToken_exe("SYMBOL","]");
        }

        //"="
        this.terminalToken_exe("SYMBOL","=");

        //expression呼び出し
        this.compileExpression();

        //";"
        this.terminalToken_exe("SYMBOL",";");

        this.nest_level--;
        this.write_tag("</letStatement>");
    }

    /* 
        whileのコンパイルを可能とする
    */
    compileWhile(){
        this.write_tag("<whileStatement>");
        this.nest_level++;

        //while
        this.terminalToken_exe(null,null);

        //"("
        this.terminalToken_exe("SYMBOL","(");

        //expression呼び出し
        this.compileExpression();

        //")"
        this.terminalToken_exe("SYMBOL",")");

        //"}"
        this.terminalToken_exe("SYMBOL","{");

        //statements
        this.compileStatements();

        //"}"
        this.terminalToken_exe("SYMBOL","}");

        this.nest_level--;
        this.write_tag("</whileStatement>");
    }

    /* 
        ●returnのコンパイルを可能とする

        ●改善検討
        ・expression呼び出しが、0回もしくは1回なので、その柔軟性がexpressionにあるならば問題なしだけど、、、
    */
    compileReturn(){
        this.write_tag("<returnStatement>");
        this.nest_level++;

        //return
        this.terminalToken_exe(null,null);

        if(this.tgt_token !== ";"){
            //expression呼び出し
            this.compileExpression();
        }

        //";"
        this.terminalToken_exe("SYMBOL",";");

        this.nest_level--;
        this.write_tag("</returnStatement>");
    }

    /* 
        ●ifのコンパイルを可能とする

        ●改善検討
        
    */
    compileIf(){
        this.write_tag("<ifStatement>");
        this.nest_level++;

        //if
        this.terminalToken_exe(null,null);

        //"("
        this.terminalToken_exe("SYMBOL","(");

        //expression呼び出し
        this.compileExpression();

        //")"
        this.terminalToken_exe("SYMBOL",")");

        //"{"
        this.terminalToken_exe("SYMBOL","{");

        //statements
        this.compileStatements();

        //"}"
        this.terminalToken_exe("SYMBOL","}");

        //elseの判定を行う
        if(this.tgt_token === "ELSE"){
            //else 
            this.terminalToken_exe(null,null);

            //"{"
            this.terminalToken_exe("SYMBOL","{");

            //statements
            this.compileStatements();

            //"}"
            this.terminalToken_exe("SYMBOL","}");
        }

        this.nest_level--;
        this.write_tag("</ifStatement>");
    }

    /* 
        ●expressionのコンパイルを可能とする

        ●改善検討
        
    */
    compileExpression(){        
        this.write_tag("<expression>");
        this.nest_level++;

        let i = 0;
        while(true){
            if(i === 0){
                i++;
                this.compileTerm();
            }

            //
            if(op.includes(this.tgt_token)){
                //op
                this.terminalToken_exe(null,null);
                
                //term呼び出し
                this.compileTerm();
            }else{
                break;
            }
        }

        this.nest_level--;
        this.write_tag("</expression>");
    }

    /* 
        ●termのコンパイルを可能とする

        ●改善検討
        ・unaryOpが二連続の場合コンパイルエラーにするべきかな.また再起として呼び出す場合にタグが二重化してしまうな
        ・identifierの処理を簡略化した。変数等の検索処理は未対応
    */
    compileTerm(){ //からの場合の対処を考えていない。
        this.write_tag("<term>");
        this.nest_level++;

        /* termの処理記述(tgt_typeを使用しないでもいいかなとも考えている) */
        switch(this.tgt_type){
            case "SYMBOL" :
                if(unaryop.includes(this.tgt_token)){
                    //unaryop
                    this.terminalToken_exe(null,null);

                    //再帰還数
                    this.compileTerm();
                    break;
                }else if(this.tgt_token === "("){
                    //"("
                    this.terminalToken_exe("SYMBOL","(");

                    //expression
                    this.compileExpression();

                    //")"
                    this.terminalToken_exe("SYMBOL",")")
                    break;
                }else if(this.tgt_token === ";"){
                    //";"の際には、エラーを流さずに処理をスキップする。
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
                    console.log(this.tgt_token);
                    console.log(this.tgt_type);
                    //keywordConstant以外のkeywordを使用することができない
                    throw new Error();
                }
            case "STRING_CONSTANT" :
                this.terminalToken_exe(null,null);
                break;
            case "INT_CONST" :
                this.terminalToken_exe(null,null);
                break;
            case "IDENTIFIER" :
                //tokenを保管しておく
                let tmp_token = this.tgt_token;
                this.updateToken();

                //tag作成
                let tag = `<identifier>${tmp_token}</identifier>`;
                this.write_tag(tag);

                if(this.tgt_token === "(" || this.tgt_token === "."){
                    /* subroutineCall */
                    this.subroutineCall(tmp_token);
                }else{
                    if(this.tgt_token === "["){
                        //"["
                        this.terminalToken_exe("SYMBOL","[");

                        //expression呼び出し
                        this.compileExpression();

                        //"]"
                        this.terminalToken_exe("SYMBOL","]");
                    }
                }
                break;

        }

        this.nest_level--;
        this.write_tag("</term>");
    }

    /* 
        ●expressionListのコンパイルを可能とする

        ●改善検討
        ・一応これが呼び出された時点で引数の中身だと確定はしている
        ・考え方としては、")"がくるまでかと
    */
    compileExpressionList(){
        this.write_tag("<expressionList>");
        this.nest_level++;

        /* compileExpressionの処理記述 */
        if(this.tgt_token !==  ")"){
            while(true){
                //expression呼び出し
                this.compileExpression();

                if(this.tgt_token === ","){
                    this.terminalToken_exe("SYMBOL",",");
                }else{
                    break;
                }
            }
        }
        
        this.nest_level--;
        this.write_tag("</expressionList>");
    }

    /* 以下、処置をまとめる際に利用する(そのため、containerを必要としない) */

    /* 
        インスタンス変数であるということを認識している必要があるのではないか
        変数の処理を無視
    */
    subroutineCall(tmp_token){
        //className|varName　もしくはsubroutineNameが処理される
        if(tmp_token === undefined){
            this.terminalToken_exe("IDENTIFIER",null);
        }

        if(this.tgt_token === "("){
            //subroutineNameの処理
            this.terminalToken_exe("SYMBOL","(");
            this.compileExpressionList();
            this.terminalToken_exe("SYMBOL",")");
        }else if(this.tgt_token === "."){
            //varName|classNameの処理
            this.terminalToken_exe("SYMBOL",".");
            this.terminalToken_exe("IDENTIFIER",null);
            this.terminalToken_exe("SYMBOL","(");
            this.compileExpressionList();
            this.terminalToken_exe("SYMBOL",")");
        }else{
            //"("か"."のみしか入らない
            throw new Error();
        }
        
    }

    /* 
        typeの処理を行う
        ●引数
            配列形式で受け取る。
            内容は、typeに追加するtoken

        ●不足点
            クラスの有無を判定する機能がidentifier内に必要となるかも
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

    //タグ作成とネストのレベル調整を行う関数(リファクタリング時に使用する)
    container(tagName){
        this.nest_level++;
        this.write_tag(`<${tagName}>`);

        //内包するメソッドを呼び出す

        this.write_tag(`</${tagName}>`);
        this.nest_level--;
    }
}

module.exports = CompilationEngine;

/* 
    リファクタリングの最終形式は構文を配列形式にして、for文で回すようにするかもしれない

    明日の予定
    対応として複数のパターンが考えられる
    ・コンパイルエラーを出力するのであれば、varName等に関しては、前定義済みのものでなければならない
    ・また対応するエラーを出力させる必要がある。
    ・変数のスコープ（不明なため、登録処理がわかっていない）

    この後の予定
    ・リファクタリング(特にterm)
    ・continerの作成
    ・同プログラムをまとめる
    ・タグの前後に空白
    ・小文字に変換する（keyword）
    →多分問題なく動作する。現状keywordをcontainerから出力する場合にのみ小文字変換ができている。なので、それ以外から出力されないかを確認
*/