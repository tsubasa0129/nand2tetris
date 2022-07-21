// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Mult.asm

// Multiplies R0 and R1 and stores the result in R2.
// (R0, R1, R2 refer to RAM[0], RAM[1], and RAM[2], respectively.)
//
// This program only needs to handle arguments that satisfy
// R0 >= 0, R1 >= 0, and R0*R1 < 32768.

// Put your code here.
//この上の部分は不要だな

@R2
M=0

(LOOP)
    @R1 //R1の値との減算を行えばいいのではないか
    D=M
    //ここに条件に応じたジャンプ命令を実行しなければならない。とするとjltである必要はなくなるな
    @END
    D;JLE //0よりもDが小さい場合にENDへのjump命令を実行する

    @R0
    D=M //Mの値を変数Dに格納している。
    @R2
    M=M+D //そして加算をしている。
    @R1 //R1の値との減算を行えばいいのではないか
    M=M-1

    @LOOP
    0;JMP

(END)
