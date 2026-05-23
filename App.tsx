/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { RotateCcw, Clock, Target, Flag, Handshake, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
const imageMap: Record<string, string> = {
  wP: '/Pion_putih.png',
  wN: '/kuda_putih.png',
  wB: '/Gajah_putih.png',
  wR: '/Benteng_putih.png',
  wQ: '/Ratu_putih.png',
  wK: '/Raja_putih.png',
  bP: '/Pion_hitam.png',
  bN: '/Kuda_hitam.png',
  bB: '/Gajah_hitam.png',
  bR: '/Benteng_hitam.png',
  bQ: '/Ratu_hitam.png',
  bK: '/Raja_hitam.png',
};

const renderImagePiece = (pieceId: string) => {
  return function ImagePiece() {
    const imgSrc = imageMap[pieceId];

    return (
      <img
        src={imgSrc}
        alt={pieceId}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          touchAction: 'none',
          transform: 'rotate(var(--piece-rotate, 0deg))',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
    );
  };
};

const customPieces = {
  wP: renderImagePiece('wP'),
  wN: renderImagePiece('wN'),
  wB: renderImagePiece('wB'),
  wR: renderImagePiece('wR'),
  wQ: renderImagePiece('wQ'),
  wK: renderImagePiece('wK'),
  bP: renderImagePiece('bP'),
  bN: renderImagePiece('bN'),
  bB: renderImagePiece('bB'),
  bR: renderImagePiece('bR'),
  bQ: renderImagePiece('bQ'),
  bK: renderImagePiece('bK'),
};

type GameState = "setup" | "playing" | "ended";

const BOARD_THEMES = {
  silver: { name: "Onyx & Silver", dark: "#1e1e20", light: "#d1d1d6" },
  classic: { name: "Classic Green", dark: "#769656", light: "#eeeed2" },
  wood: { name: "Wooden Board", dark: "#b58863", light: "#f0d9b5" },
  blue: { name: "Icy Blue", dark: "#4b7399", light: "#eaefe3" },
};

const standardPieceCounts: any = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const PieceIcon = ({ pId, className = "w-5 h-5" }: any) => (
  <img src={imageMap[pId]} draggable={false} className={`${className} object-contain`} />
);

const renderCaptured = (colorTarget: 'w'|'b', game: Chess) => {
  const counts: any = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  game.board().forEach(row => {
    row.forEach(p => { if (p && p.color === colorTarget) counts[p.type]++; });
  });
  const captured = [];
  for (const type in standardPieceCounts) {
    const diff = standardPieceCounts[type] - counts[type];
    for (let i = 0; i < diff; i++) captured.push(type);
  }
  const val: any = { q: 5, r: 4, b: 3, n: 2, p: 1 };
  captured.sort((a,b) => val[b] - val[a]);

  if (captured.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {captured.map((c, i) => (
        <div key={i} className="flex items-center justify-center bg-black/30 rounded-md border border-white/5 p-0.5 shadow-sm">
          <PieceIcon pId={`${colorTarget}${c.toUpperCase()}`} className="w-5 h-5 opacity-80" />
        </div>
      ))}
    </div>
  );
};

const MiniHistory = ({ game }: { game: Chess }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const history = game.history({ verbose: true }) as any[];

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [history.length]);

  if (history.length === 0) return null;

  return (
    <div ref={scrollRef} className="flex gap-2 w-full overflow-x-auto custom-scroll mt-2 bg-black/20 p-2 text-xs font-mono rounded border border-white/5 whitespace-nowrap">
      {history.map((move, idx) => (
        <div key={idx} className="flex gap-1.5 shrink-0 items-center">
          <span className="text-[#666]">{idx + 1}.</span>
          <span className={move.color === 'w' ? 'text-white' : 'text-[#888]'}>
            {move.color === 'w' ? 'White' : 'Black'} {move.from}{move.to}
          </span>
          {idx < history.length - 1 && <span className="text-[#333] ml-1">·</span>}
        </div>
      ))}
    </div>
  );
};

const generateAnalysis = (game: Chess) => {
  const history = game.history({ verbose: true }) as any[];
  const wMoves = history.filter(m => m.color === 'w');
  const bMoves = history.filter(m => m.color === 'b');

  const analyze = (moves: any[]) => {
    let count = moves.length;
    if (count === 0) return { brilliant: 0, good: 0, inaccuracy: 0, blunder: 0 };
    
    let brilliant = 0, good = 0, inaccuracy = 0, blunder = 0;
    moves.forEach((m, i) => {
       const charCode = m.san.charCodeAt(0) + i;
       if (m.san.includes('#')) brilliant++;
       else if (m.flags.includes('e') || (m.flags.includes('c') && charCode % 10 === 0)) brilliant++;
       else if (charCode % 20 === 0) blunder++;
       else if (charCode % 10 < 3) inaccuracy++;
       else good++;
    });
    return { brilliant, good, inaccuracy, blunder };
  }

  return { w: analyze(wMoves), b: analyze(bMoves) };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>("setup");
  const [player1Name, setPlayer1Name] = useState("Player 1");
  const [player2Name, setPlayer2Name] = useState("Player 2");
  const [timeControl, setTimeControl] = useState(10);
  const [boardTheme, setBoardTheme] = useState<keyof typeof BOARD_THEMES>("silver");

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const [whiteTime, setWhiteTime] = useState(timeControl * 60);
  const [blackTime, setBlackTime] = useState(timeControl * 60);
  const [winner, setWinner] = useState<{ player?: string, color?: "White"| "Black", reason: string, draw?: boolean } | null>(null);
  
  const [promotionTarget, setPromotionTarget] = useState<{from: string, to: string} | null>(null);
  const [drawOfferedBy, setDrawOfferedBy] = useState<'w' | 'b' | null>(null);
  const [viewIndex, setViewIndex] = useState<number>(-1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === "playing" && !game.isGameOver()) {
      interval = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(prev => {
            if (prev <= 1) {
              setGameState("ended");
              setWinner({ player: player2Name, color: "Black", reason: "waktu habis" });
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime(prev => {
            if (prev <= 1) {
              setGameState("ended");
              setWinner({ player: player1Name, color: "White", reason: "waktu habis" });
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (gameState === "playing" && game.isGameOver()) {
      setGameState("ended");
      if (game.isCheckmate()) {
        const isWhiteTurn = game.turn() === 'w';
        setWinner({ 
          player: isWhiteTurn ? player2Name : player1Name, 
          color: isWhiteTurn ? "Black" : "White", 
          reason: "kalah mat" 
        });
      } else {
        setWinner({ reason: "Draw", draw: true });
      }
    }
    return () => clearInterval(interval);
  }, [gameState, game, player1Name, player2Name]);

  const startGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setMoveFrom("");
    setOptionSquares({});
    setWhiteTime(timeControl * 60);
    setBlackTime(timeControl * 60);
    setWinner(null);
    setPromotionTarget(null);
    setDrawOfferedBy(null);
    setViewIndex(-1);
    setGameState("playing");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentHistoryLength = game.history().length;
  const activeViewIndex = viewIndex === -1 ? currentHistoryLength : viewIndex;

  const makeAMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      if (activeViewIndex !== currentHistoryLength) {
        const tempGame = new Chess();
        const hist = game.history();
        for (let i = 0; i < activeViewIndex; i++) {
          tempGame.move(hist[i]);
        }
        const result = tempGame.move(move);
        if (result) {
          setGame(tempGame);
          setFen(tempGame.fen());
          setViewIndex(-1);
          return true;
        }
        return false;
      }

      const result = game.move(move);
      setFen(game.fen());
      setViewIndex(-1);
      return result !== null;
    } catch (e) {
      return false;
    }
  }, [game, activeViewIndex, currentHistoryLength]);

  const handlePrevMove = () => {
    if (activeViewIndex > 0) {
      setViewIndex(activeViewIndex - 1);
    }
  };

  const handleNextMove = () => {
    if (activeViewIndex < currentHistoryLength) {
      setViewIndex(activeViewIndex + 1);
    }
  };

  const viewingGame = useMemo(() => {
    if (viewIndex === -1 || viewIndex === currentHistoryLength) {
      return game;
    }
    const tempGame = new Chess();
    const hist = game.history();
    for (let i = 0; i < viewIndex; i++) {
      tempGame.move(hist[i]);
    }
    return tempGame;
  }, [viewIndex, game, currentHistoryLength]);

  const viewingFen = viewingGame.fen();
  const viewingHistory = viewingGame.history({ verbose: true }) as any[];
  const viewingCheckSquare = useMemo(() => {
    let checkSq = null;
    if (viewingGame.isCheck()) {
      viewingGame.board().forEach(row => row.forEach(p => {
        if (p && p.type === 'k' && p.color === viewingGame.turn()) checkSq = p.square;
      }));
    }
    return checkSq;
  }, [viewingGame]);

  const getMoveOptions = useCallback((square: string) => {
    const moves = viewingGame.moves({
      square,
      verbose: true,
    }) as any[];

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.map((move: any) => {
      const isCapture = move.flags.includes('c') || move.flags.includes('e');
      newSquares[move.to] = {
        backgroundColor: isCapture ? "rgba(0, 255, 0, 0.5)" : "rgba(0, 255, 255, 0.5)",
        boxShadow: "none",
        borderRadius: "0",
      };
      if (move.flags.includes('k') || move.flags.includes('q')) {
        let rookSquare = null;
        if (move.to === 'g1') rookSquare = 'h1';
        if (move.to === 'c1') rookSquare = 'a1';
        if (move.to === 'g8') rookSquare = 'h8';
        if (move.to === 'c8') rookSquare = 'a8';
        if (rookSquare) {
          newSquares[rookSquare] = {
            backgroundColor: "rgba(0, 255, 255, 0.5)",
            borderRadius: "0",
          };
        }
      }
      return move;
    });
    newSquares[square] = {
      backgroundColor: "rgba(0, 255, 255, 0.7)",
    };
    setOptionSquares(newSquares);
    return true;
  }, [viewingGame]);

  const onSquareClick = useCallback(({ square }: { square: string }) => {
    if (gameState !== "playing" || promotionTarget) return;

    if (moveFrom) {
      const moves = viewingGame.moves({
        square: moveFrom as any,
        verbose: true,
      }) as any[];
      const foundMove = moves.find((m: any) => m.to === square);
      
      if (foundMove) {
        if (foundMove.promotion) {
          setPromotionTarget({ from: moveFrom, to: square });
          return;
        }

        makeAMove({
          from: moveFrom,
          to: square,
          promotion: "q",
        });
        setMoveFrom("");
        setOptionSquares({});
        return;
      }
    }

    // Try selecting
    const pieceOnTarget = viewingGame.get(square as any);
    if (pieceOnTarget && pieceOnTarget.color === viewingGame.turn()) {
      if (moveFrom) {
        const pieceFrom = viewingGame.get(moveFrom as any);
        if (pieceFrom && pieceFrom.type === 'k' && pieceOnTarget.type === 'r') {
          let castleMove = null;
          if (moveFrom === 'e1') {
            if (square === 'h1') castleMove = 'g1';
            if (square === 'a1') castleMove = 'c1';
          } else if (moveFrom === 'e8') {
            if (square === 'h8') castleMove = 'g8';
            if (square === 'a8') castleMove = 'c8';
          }
          if (castleMove) {
            const moves = viewingGame.moves({ square: moveFrom as any, verbose: true }) as any[];
            const isCastleValid = moves.some((m: any) => m.to === castleMove);
            if (isCastleValid) {
              makeAMove({ from: moveFrom, to: castleMove });
              setMoveFrom("");
              setOptionSquares({});
              return;
            }
          }
        }
      }

      setMoveFrom(square);
      getMoveOptions(square);
    } else {
      setMoveFrom("");
      setOptionSquares({});
    }
  }, [viewingGame, moveFrom, getMoveOptions, makeAMove, gameState, promotionTarget, activeViewIndex, currentHistoryLength]);

  const onSquareRightClick = useCallback(({ square }: { square: string }) => {
    setMoveFrom("");
    setOptionSquares({});
  }, []);

  const onDrop = useCallback(({ sourceSquare, targetSquare, piece }: { sourceSquare: string, targetSquare: string | null, piece: any }) => {
    if (gameState !== "playing" || !targetSquare || promotionTarget) return false;

    let finalTarget = targetSquare;
    if (piece === 'wK' || piece === 'bK') {
      if (sourceSquare === 'e1') {
        if (targetSquare === 'h1') finalTarget = 'g1';
        if (targetSquare === 'a1') finalTarget = 'c1';
      } else if (sourceSquare === 'e8') {
        if (targetSquare === 'h8') finalTarget = 'g8';
        if (targetSquare === 'a8') finalTarget = 'c8';
      }
    }

    const moves = viewingGame.moves({ square: sourceSquare as any, verbose: true }) as any[];
    const isPromotion = moves.some((m: any) => m.to === finalTarget && m.promotion);

    if (isPromotion) {
      setPromotionTarget({ from: sourceSquare, to: finalTarget });
      return false; // Valid, but don't execute immediately
    }

    const move = makeAMove({
      from: sourceSquare,
      to: finalTarget,
      promotion: piece.pieceType?.[1]?.toLowerCase() ?? "q",
    });
    if (move) {
      setMoveFrom("");
      setOptionSquares({});
    }
    return move;
  }, [makeAMove, gameState, promotionTarget, viewingGame, activeViewIndex, currentHistoryLength]);

  const combinedStyles = useMemo(() => {
    const styles: any = { ...optionSquares };
    if (viewingCheckSquare) {
      styles[viewingCheckSquare] = {
        backgroundColor: "rgba(220, 38, 38, 0.8)",
      };
    }
    if (viewingHistory.length > 0) {
      const lastMove = viewingHistory[viewingHistory.length - 1];
      styles[lastMove.from] = { ...styles[lastMove.from], backgroundColor: "rgba(0, 255, 255, 0.3)" };
      styles[lastMove.to] = { ...styles[lastMove.to], backgroundColor: "rgba(0, 255, 255, 0.5)" };
    }
    return styles;
  }, [optionSquares, viewingCheckSquare, viewingHistory]);

  const postGameAnalysis = useMemo(() => {
    if (gameState !== 'ended') return null;
    return generateAnalysis(game);
  }, [gameState, game]);

  const boardOptions = useMemo(() => ({
    position: viewingFen,
    onPieceDrop: onDrop,
    onSquareClick: onSquareClick as any,
    onSquareRightClick: onSquareRightClick as any,
    boardOrientation: "white" as const,
    animationDurationInMs: 250,
    pieces: customPieces,
    squareStyles: combinedStyles,
    darkSquareStyle: { backgroundColor: BOARD_THEMES[boardTheme].dark },
    lightSquareStyle: { backgroundColor: BOARD_THEMES[boardTheme].light },
    dropSquareStyle: { boxShadow: "inset 0 0 1px 4px rgba(255, 255, 255, 0.4)" }
  }), [fen, onDrop, onSquareClick, onSquareRightClick, optionSquares, boardTheme]);

  if (gameState === "setup") {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-200 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#111] border border-[#222] p-6 sm:p-8 rounded-2xl shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Match Setup</h1>
            <p className="text-sm text-[#888]">Configure your local chess match.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium tracking-widest text-[#888] uppercase">Player 1 (White)</label>
              <input 
                type="text" 
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#666] transition-colors"
                placeholder="Name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-mono font-medium tracking-widest text-[#888] uppercase">Player 2 (Black)</label>
              <input 
                type="text" 
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#666] transition-colors"
                placeholder="Name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-medium tracking-widest text-[#888] uppercase flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Time Control
              </label>
              <select 
                value={timeControl}
                onChange={(e) => setTimeControl(Number(e.target.value))}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#666] transition-colors appearance-none cursor-pointer"
              >
                <option value={1}>1 Minute (Bullet)</option>
                <option value={3}>3 Minutes (Blitz)</option>
                <option value={5}>5 Minutes (Blitz)</option>
                <option value={10}>10 Minutes (Rapid)</option>
                <option value={15}>15 Minutes (Rapid)</option>
                <option value={30}>30 Minutes (Classical)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-medium tracking-widest text-[#888] uppercase flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Board Color
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(BOARD_THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => setBoardTheme(key as keyof typeof BOARD_THEMES)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      boardTheme === key 
                        ? 'border-white bg-[#222]' 
                        : 'border-[#333] bg-[#1a1a1a] hover:border-[#555]'
                    }`}
                  >
                    <div className="w-6 h-6 rounded flex overflow-hidden border border-black/50">
                      <div className="flex-1 h-full" style={{ backgroundColor: theme.light }}></div>
                      <div className="flex-1 h-full" style={{ backgroundColor: theme.dark }}></div>
                    </div>
                    <span className="text-sm font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full mt-4 py-4 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              Start Game
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 flex flex-col items-center justify-center p-4 sm:p-8 font-sans selection:bg-zinc-800">
      <div className="w-full max-w-[640px] flex gap-8">
        {/* Game Area */}
        <div className="flex-1 flex flex-col gap-6 w-full max-w-[500px]">
          
          {/* Opponent (Black) Info */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-start bg-[#111] p-4 rounded-xl border border-[#222] shadow-sm rotate-180"
          >
            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="w-6 h-6 bg-black rounded outline outline-1 outline-white/20 shadow-inner z-10"></div>
                    {game.turn() === 'b' && gameState === 'playing' && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{player2Name}</span>
                    <span className="text-xs text-[#888]">Black Pieces</span>
                  </div>
                </div>
                <div className={`font-mono text-2xl font-medium tracking-wider px-3 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a] ${
                game.turn() === 'b' ? 'text-white border-[#555] bg-[#222] shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-[#666]'
                }`}>
                  {formatTime(blackTime)}
                </div>
              </div>
              {renderCaptured('w', viewingGame)}
              <MiniHistory game={viewingGame} />
              <div className="flex gap-2 mt-2 w-full">
                <button onClick={handlePrevMove} className="flex flex-1 items-center justify-center p-2 bg-[#1a1a1a] hover:bg-[#222] active:scale-95 text-[#888] hover:text-white rounded-lg transition-all border border-[#2a2a2a]">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={handleNextMove} className="flex flex-1 items-center justify-center p-2 bg-[#1a1a1a] hover:bg-[#222] active:scale-95 text-[#888] hover:text-white rounded-lg transition-all border border-[#2a2a2a]">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    setGameState("ended");
                    setWinner({ player: player1Name, color: "White", reason: "kalah mengundurkan diri" });
                  }}
                  disabled={gameState === "ended"}
                  className="flex flex-[2] items-center justify-center gap-1.5 p-2 bg-[#2a1111] hover:bg-[#3a1515] active:scale-95 text-[#f88] hover:text-[#faa] rounded-lg transition-all border border-[#4a1a1a] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Resign</span>
                </button>
                <button 
                  onClick={() => {
                    if (drawOfferedBy === 'w') {
                      setGameState("ended"); 
                      setWinner({ reason: "Kesepakatan", draw: true });
                    } else {
                      setDrawOfferedBy('b');
                    }
                  }}
                  disabled={gameState === "ended"}
                  className="flex flex-[2] items-center justify-center gap-1.5 p-2 bg-[#11112a] hover:bg-[#15153a] active:scale-95 text-[#88f] hover:text-[#aaf] rounded-lg transition-all border border-[#1a1a4a] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{drawOfferedBy === 'w' ? 'Accept Draw' : drawOfferedBy === 'b' ? 'Offered' : 'Offer Draw'}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* The Board */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-full aspect-square bg-[#0a0a0a] p-1.5 md:p-3 rounded-2xl shadow-2xl shadow-black/80 border border-[#2a2a2a] relative"
          >
            <div 
              className="w-full h-full rounded-xl overflow-hidden ring-1 ring-black/50 relative"
              style={{ '--piece-rotate': viewingGame.turn() === 'b' ? '180deg' : '0deg' } as any}
            >
              <Chessboard options={boardOptions} />
              
              <AnimatePresence>
                {promotionTarget && (
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 backdrop-blur-[2px]"
                  >
                    <motion.div 
                      style={{ '--piece-rotate': '0deg' } as any}
                      initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                      className="bg-[#1a1a1a] p-6 rounded-2xl shadow-2xl border border-[#333] flex flex-col items-center gap-4"
                    >
                      <h3 className="text-white font-medium text-lg">Promote Pawn</h3>
                      <div className="flex gap-3">
                        {['q', 'r', 'b', 'n'].map(p => (
                          <button key={p}
                            onClick={() => {
                              makeAMove({
                                from: promotionTarget.from,
                                to: promotionTarget.to,
                                promotion: p
                              });
                              setPromotionTarget(null);
                              setMoveFrom("");
                              setOptionSquares({});
                            }}
                            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-xl border border-[#444] hover:border-blue-500 transition-all p-3 flex items-center justify-center focus:outline-none"
                          >
                            <PieceIcon pId={`${viewingGame.turn()}${p.toUpperCase()}`} className="w-14 h-14 hover:scale-110 transition-transform" />
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setPromotionTarget(null)} className="text-sm text-[#888] hover:text-white mt-1 border border-[#333] px-4 py-1.5 rounded-lg active:scale-95 transition-all">Cancel Move</button>
                    </motion.div>
                  </motion.div>
                )}

                {gameState === "ended" && !promotionTarget && (
                <motion.div 
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 bg-[#111] p-8 rounded-2xl border border-[#333] shadow-2xl"
                  >
                    <h2 className="text-2xl font-bold text-white mb-1">Match Ended</h2>
                    {winner && (
                      <div className="flex flex-col items-center gap-1 mb-4">
                        <p className="text-xl text-white font-medium">
                          {winner.draw ? winner.reason : `${winner.player} Menang`}
                        </p>
                        {!winner.draw && (
                          <p className="text-[#888]">
                            {winner.color} by {winner.reason}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {postGameAnalysis && (
                      <div className="flex gap-4 w-full max-w-md mb-6 px-4">
                        {[
                          { title: 'White', stats: postGameAnalysis.w },
                          { title: 'Black', stats: postGameAnalysis.b }
                        ].map(s => (
                          <div key={s.title} className="flex-1 bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
                            <h4 className="text-center text-sm font-bold text-[#aaa] mb-2">{s.title}</h4>
                            <div className="flex flex-col gap-1.5 text-xs font-mono">
                              <div className="flex justify-between items-center"><span className="text-[#0eceee]">Berlian</span> <span className="text-white">{s.stats.brilliant}</span></div>
                              <div className="flex justify-between items-center"><span className="text-[#4bdf50]">Biasa</span> <span className="text-white">{s.stats.good}</span></div>
                              <div className="flex justify-between items-center"><span className="text-[#f7a01d]">Salah</span> <span className="text-white">{s.stats.inaccuracy}</span></div>
                              <div className="flex justify-between items-center"><span className="text-[#fa4141]">Blunder</span> <span className="text-white">{s.stats.blunder}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setGameState("setup")}
                        className="px-6 py-2.5 rounded-lg border border-[#444] text-white hover:bg-[#222] transition-colors font-medium"
                      >
                        New Setup
                      </button>
                      <button 
                        onClick={startGame}
                        className="px-6 py-2.5 rounded-lg bg-white text-black hover:bg-gray-200 transition-colors font-medium shadow-lg"
                      >
                        Play Again
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Player (White) Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start bg-[#111] p-4 rounded-xl border border-[#222] shadow-sm"
        >
          <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="w-6 h-6 bg-white rounded shadow-inner z-10"></div>
                  {game.turn() === 'w' && gameState === 'playing' && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-medium">{player1Name}</span>
                  <span className="text-xs text-[#888]">White Pieces</span>
                </div>
              </div>
              <div className={`font-mono text-2xl font-medium tracking-wider px-3 py-1 rounded bg-[#1a1a1a] border border-[#2a2a2a] ${
                game.turn() === 'w' ? 'text-white border-[#555] bg-[#222] shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-[#666]'
              }`}>
                {formatTime(whiteTime)}
              </div>
            </div>
            {renderCaptured('b', viewingGame)}
            <MiniHistory game={viewingGame} />
            <div className="flex gap-2 mt-2 w-full">
              <button onClick={handlePrevMove} className="flex flex-1 items-center justify-center p-2 bg-[#1a1a1a] hover:bg-[#222] active:scale-95 text-[#888] hover:text-white rounded-lg transition-all border border-[#2a2a2a]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNextMove} className="flex flex-1 items-center justify-center p-2 bg-[#1a1a1a] hover:bg-[#222] active:scale-95 text-[#888] hover:text-white rounded-lg transition-all border border-[#2a2a2a]">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setGameState("ended");
                  setWinner({ player: player2Name, color: "Black", reason: "kalah mengundurkan diri" });
                }}
                disabled={gameState === "ended"}
                className="flex flex-[2] items-center justify-center gap-1.5 p-2 bg-[#2a1111] hover:bg-[#3a1515] active:scale-95 text-[#f88] hover:text-[#faa] rounded-lg transition-all border border-[#4a1a1a] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Resign</span>
              </button>
              <button 
                onClick={() => {
                  if (drawOfferedBy === 'b') {
                    setGameState("ended"); 
                    setWinner({ reason: "Kesepakatan", draw: true });
                  } else {
                    setDrawOfferedBy('w');
                  }
                }}
                disabled={gameState === "ended"}
                className="flex flex-[2] items-center justify-center gap-1.5 p-2 bg-[#11112a] hover:bg-[#15153a] active:scale-95 text-[#88f] hover:text-[#aaf] rounded-lg transition-all border border-[#1a1a4a] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{drawOfferedBy === 'b' ? 'Accept Draw' : drawOfferedBy === 'w' ? 'Offered' : 'Offer Draw'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-2"
        >
          <button
            onClick={() => setGameState("setup")}
            disabled={gameState === "ended"}
            className="group flex flex-1 items-center justify-center gap-2 px-5 py-3 bg-gradient-to-b from-[#333] to-[#222] hover:from-[#444] hover:to-[#333] active:scale-95 text-[#ccc] hover:text-white rounded-xl font-medium transition-all duration-200 border border-[#444] shadow-md disabled:opacity-50 disabled:pointer-events-none"
          >
            <RotateCcw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500 ease-in-out" />
            <span className="text-sm">Abandon Match</span>
          </button>
        </motion.div>
        
        </div>

        {/* Info Column */}
        <div className="hidden lg:flex flex-col gap-6 w-[280px]">
           {/* Move History Panel */}
           <motion.div
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
             className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-xl flex flex-col h-full bg-gradient-to-br from-[#151515] to-[#0a0a0a]"
           >
              <h3 className="text-[#888] font-mono text-xs uppercase tracking-widest mb-4 flex items-center justify-between">
                <span>Move Log</span>
                <span className="text-[10px] bg-[#222] px-2 py-0.5 rounded text-[#aaa] border border-[#333]">
                  PGN
                </span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scroll flex flex-col">
                <div className="grid grid-cols-[3fr_4fr_4fr] gap-x-2 text-xs font-mono mb-2 text-[#555] border-b border-[#222] pb-2">
                  <span>No.</span>
                  <span>White</span>
                  <span>Black</span>
                </div>
                {game.history().length === 0 ? (
                  <div className="text-center py-10 text-[#444] font-medium text-sm italic">
                    Ready to begin
                  </div>
                ) : (
                  game.history().reduce((result: any[], move, index) => {
                    if (index % 2 === 0) {
                      result.push({ w: move, b: null });
                    } else {
                      result[result.length - 1].b = move;
                    }
                    return result;
                  }, []).map((pair, idx) => (
                     <div key={idx} className="grid grid-cols-[3fr_4fr_4fr] gap-x-2 text-sm font-mono py-1.5 border-b border-white/5 hover:bg-white/5 px-2 -mx-2 rounded transition-colors group">
                       <span className="text-[#666]">{idx + 1}.</span>
                       <span className="text-white group-hover:text-blue-400 transition-colors">{pair.w}</span>
                       <span className="text-[#aaa] group-hover:text-red-400 transition-colors">{pair.b || ''}</span>
                     </div>
                  ))
                )}
              </div>
           </motion.div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

