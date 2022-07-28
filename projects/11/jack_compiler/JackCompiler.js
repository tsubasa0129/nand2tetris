/* 
    入力Xxx.jackに対して、Xxx.vmを生成する・
    ちなみに、フォルダ名を指定した場合には、同フォルダ内にそれぞれのvmファイルを作成する
*/

const CompilationEngine = require("./CompilationEngine");

const fs = require("fs");
const path = require("path");

/* node jackAnalyzer.js ../ArrayTest とすることで、実行がされるように設定している(ファイル指定も可能) */

//ターミナル引数として対照の相対パスを受け取り、file_pathを形成する
let source = process.argv[2];
const file_path = path.join(__dirname,source);

//ファイルの存在の確認
let file_exist = fs.existsSync(file_path);

if(file_exist){
    let isDir = fs.statSync(file_path).isDirectory();
    //有効なファイルの拡張子
    let exts = [".jack"];

    if(isDir){
        //jackファイルの検索をかける
        let all_files = fs.readdirSync(file_path);
        let jack_files = all_files.filter(file => ext_validator(file,exts));

        /* jack_fileが存在しない時用にエラー処理を行なう 最終的にtrycatchの中に入れて、throwを行うようにする */

        jack_files.forEach((file) => {
            //input,outputを定義する
            let input_path = path.join(file_path,file);
            let output_path = path.join(file_path,file.replace(".jack",".vm"));

            //クラスもしくは関数で記載する処理を実行する
            run_analyzer(input_path,output_path);
        });
    }else{
        //一回のみの処理を行うだけ（ただしjackかどうかの判定は必要になる）
        if(ext_validator(file_path,exts)){
            //クラスもしくは関数で記載する処理を実行する
            let output_path = file_path.replace(".jack",".vm");
            run_analyzer(file_path,output_path);
        }else{
            throw new Error("指定したファイルはjackファイルではありません。");
        }
    }

    //出力ファイルに関しては、ディレクトリないに格納されているファイルごとに作成する必要がある

}else{
    //エラー処理
    throw new Error("指定したファイルが存在しません。");
}

/* 
    使用可能な拡張子かどうかの判定を行う関数
    arg1 filename(ファイル名を取得する)
    arg2 exts(使用可能な拡張子を配列形式で指定する)
    return boolean(trueの場合は使用可能な拡張子、falseの場合は使用してはいけない拡張子)
*/
function ext_validator(filename,exts){
    let ext = path.extname(filename);
    return exts.includes(ext);
}


function run_analyzer(input,output){

    //CompirationEngineをインスタンス化する際に、入力としてtokenizerを、出力としてoutputを送る
    let engine = new CompilationEngine(input,output); 

}