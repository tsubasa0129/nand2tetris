// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

// Put your code here.
@R0
M=0

(LOOP)
    //まずこのループの中では監視をする。もし、入力の値が変化すれば検知する
    @KBD
    D=M

    @BLACK
    D;JGT

    //画面を白くするかもしくはそのままに固定するかの分岐を行う
    @SCREEN
    D=M

    @CHANGE
    D;JNE //Dがゼロでなかった場合には色の変換を行う

    @END
    0;JMP

(BLACK)
    //ここでは反転するかどうかを確認する
    @SCREEN
    D=M

    @CHANGE
    D;JEQ

    @END
    0;JMP

(CHANGE)
    //ここではさっきのものを参考にスクリーンの色の反転を行う
    @R0
    D=M //格納されている値をインクリメントするのでこれを変数に移し替える
    @8192
    D=D-A
    @END
    D;JGE

    //ここ繰り返しの構文を実行する
    @R0
    D=M
    @SCREEN
    A=A+D
    M=!M //これで反転が完了

    @R0
    M=M+1 //インクリメントも完了

    @CHANGE
    0;JMP

(END)
    @R0
    M=0

    @LOOP
    0;JMP //初期へのジャンプを行う　つまり無限ループを実現する
