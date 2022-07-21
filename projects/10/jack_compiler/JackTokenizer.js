const fs = require("fs");
const util = require("util");

class JackTokenizer {

    //基本的にトークン化としてやりたいことは、配列内にトークンを一つずつ分解して並べること
    constructor(input){
        let content = fs.readFileSync(input,{encoding:"utf-8"});

        this.symbols = [
            "{","}","(",")","[","]",".",",",";","+","-","*","/","&","|","<",">","=","~"
        ];

        this.keywords = [
            "class","constructor","function","method","field","static","var","int","char","boolean","void","true","false","null","this","let","do","if","else","while","return"
        ];

        this.token = [];

        this.toTokenize(content);
        this.jack_leng = this.token.length;

        //console.log(util.inspect(this.token,{maxArrayLength : null}));

        this.lineCounter = 0;
    }

    //入力トークンはまだあるかの判定をする
    hasMoreTokens(){
        if(this.lineCounter >= this.jack_leng){
            return false;
        }

        this.lineCounter++;
        return true;
    }

    //新規トークンの取得
    advance(){
        this.current_token = this.token[this.lineCounter - 1];
    }

    //現トークンの種類を返す
    tokenType(){
        //this.currentTokenを対象に検知をする
        let symbol_check = this.symbols.includes(this.current_token);
        let keyword_check = this.keywords.includes(this.current_token);
        let stringConstant_check = this.current_token.startsWith("\"") && this.current_token.endsWith("\"");
        let integerConstant_check = !isNaN(this.current_token);
        
        if(symbol_check){
            return "SYMBOL";
        }else if(keyword_check){
            return "KEYWORD";
        }else if(stringConstant_check){
            return "STRING_CONSTANT";
        }else if(integerConstant_check){
            return "INT_CONST";
        }else{
            return "IDENTIFIER"; //ここelseだと不安かもしれないな
        }
    }

    //現トークンのキーワードを返す
    keyWord(){
        return this.current_token.toUpperCase();
    }

    //現トークンの文字を返す
    symbol(){
        return this.current_token;
    }

    //現トークンの識別子を返す
    identifier(){
        return this.current_token;
    }

    //現トークンの整数の値を返す
    intVal(){
        return this.current_token;
    }

    //現トークンの文字列を返す
    StringVal(){
        return this.current_token;
    }

    /* custom function */
    toTokenize(command){
        command = command.trim();

        //commandからコメントを削除する
        let deleted_lineComment = command.replace(new RegExp(/\/\*[\s\S]*?\*\//,"g"),"");
        let deleted_allComment = deleted_lineComment.replace(new RegExp(/\/\/[\s\S]*?\n/,"g"),"\n");

        //ダブルクォーテーションでsplit
        let array = deleted_allComment.split("\""); //ダブルクォーテーション内の文字列はなんでもいいので、ここの段階でstringConstantであると示す必要がある。

        array.forEach((str_judge,i) => {
            if(i%2 !==0){
                let stringConstant = "\"" + array[i] + "\"";
                this.token.push(stringConstant);
                return;
            }
            
            //行ごとに文字列を分割する
            let line_division = str_judge
                .split(/\t\r\n|\r\n|\n|\t|\r/)
                .map(str => str.trim())
                .filter(str => str !== "")

            //splitSymbol関数に処理を託す
            line_division.forEach((line) => {
                this.space_spliter(line);
            });
        });
    }

    space_spliter(line){
        let pre_token_array = line.split(" ");

        pre_token_array.forEach((pre_token) => {
            this.splitSymbol(pre_token);
        });
    }

    splitSymbol(pre_token){
        //中身が空の場合の処理を行う
        if(pre_token.length === 0){
            return;
        }

        //シンボルの検索を繰り返し、splitをおこなう。無くなるまで再起させる pre_tokenは空白でsplitした要素
        if(pre_token.length === 1){
            this.token.push(pre_token);
            return;
        }

        //pre_tokenが2文字以上ある場合
        let new_pre_token = "";

        for(var i=0;i<pre_token.length;i++){
            let letter = pre_token.charAt(i);

            //シンボルが含まれない場合の処理
            if(!this.symbols.includes(letter)){
                if(i + 1 === pre_token.length){
                    this.token.push(pre_token);
                    break;
                }
                continue;
            }

            //シンボルを発見した場合の処理
            if(i === 0){
                this.token.push(letter);
            }else{
                let unSymbol = pre_token.substr(0,i);
                this.token.push(unSymbol,letter);
            }

            new_pre_token = pre_token.substr(i+1);
            break;
        }

        if(new_pre_token !== ""){
            this.splitSymbol(new_pre_token);
            return;
        }
    }
}

module.exports = JackTokenizer;