import { useEffect, useState, useRef } from 'react'
import { generateMaze } from './game/mazeGenerator'
import { solve } from './game/solver'
import type { Pos, Algorithm, Solution } from './game/solver'
import Maze2D from './components/Maze2D'
import MazeThree from './components/MazeThree'

const DIR_KEY: Record<string, Pos> = {
  ArrowUp: { r: -1, c: 0 },
  ArrowDown: { r: 1, c: 0 },
  ArrowLeft: { r: 0, c: -1 },
  ArrowRight: { r: 0, c: 1 },
}

function App() {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const visualizationCancelledRef = useRef(false)
  const [mazeSize, setMazeSize] = useState(21)
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [algorithm, setAlgorithm] = useState<Algorithm>('bfs')
  const [currentLevel, setCurrentLevel] = useState(() => generateMaze(21, 21))

  const [player, setPlayer] = useState<Pos>(currentLevel.start)
  const [moves, setMoves] = useState(0)

  // Visualization state
  const [isVisualizing, setIsVisualizing] = useState(false)
  const [visualizedCells, setVisualizedCells] = useState<Pos[]>([])
  const [showOptimalPath, setShowOptimalPath] = useState(false)
  const [algorithmLogs, setAlgorithmLogs] = useState<string[]>([])
  const [showAStarScores, setShowAStarScores] = useState(false)
  const [isStepMode, setIsStepMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D')

  // Recalculate solution when level or algorithm changes
  const [solution, setSolution] = useState(() => solve(currentLevel, algorithm))
  
  useEffect(() => {
    setSolution(solve(currentLevel, algorithm))
    setVisualizedCells([])
    setShowOptimalPath(false)
    setAlgorithmLogs([])
    setShowAStarScores(false)
  }, [currentLevel, algorithm])

  // Generate new maze with current settings
  const generateNewMaze = () => {
    visualizationCancelledRef.current = true // Stop any ongoing visualization
    const newLevel = generateMaze(mazeSize, mazeSize, difficulty)
    setCurrentLevel(newLevel)
    setPlayer(newLevel.start)
    setMoves(0)
    setVisualizedCells([])
    setShowOptimalPath(false)
    setIsVisualizing(false)
    setTimeout(() => {
      visualizationCancelledRef.current = false // Reset cancellation flag
    }, 100)
  }

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setAlgorithmLogs(prev => [...prev, `${timestamp}: ${message}`])
  }

  // Initialize log window with welcome message
  useEffect(() => {
    if (algorithmLogs.length === 0) {
      setTimeout(() => {
        addLog(`🎮 Log system ready - Click "Visualize Solve" to see algorithms in action!`)
      }, 100)
    }
  }, [algorithmLogs.length])

  // Auto-scroll log to bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [algorithmLogs])

  // Animate the pathfinding algorithm
  const visualizeSolving = async () => {
    if (!solution?.visitedCells) return
    
    // If already visualizing, stop it
    if (isVisualizing) {
      visualizationCancelledRef.current = true
      setIsVisualizing(false)
      setIsPaused(false)
      addLog(`⏹️ Visualization stopped by user`)
      return
    }
    
    setIsVisualizing(true)
    visualizationCancelledRef.current = false
    setVisualizedCells([])
    setShowOptimalPath(false)
    setCurrentStep(0)
    
    addLog(`🚀 Starting ${solution.algorithm} algorithm`)
    addLog(`📍 Starting position: (${currentLevel.start.r}, ${currentLevel.start.c})`)
    addLog(`🎯 Looking for exit at maze border`)
    addLog(`📊 Total cells to explore: ${solution.visitedCells.length}`)
    
    // Algorithm-specific information
    if (solution.algorithm === 'BFS') {
      addLog(`ℹ️ BFS explores level by level, guarantees shortest path`)
    } else if (solution.algorithm === 'DFS') {
      addLog(`ℹ️ DFS explores deeply first, may not find shortest path`)
    } else if (solution.algorithm === 'A*') {
      addLog(`ℹ️ A* uses heuristics to guide search toward goal`)
    } else if (solution.algorithm === 'Dijkstra') {
      addLog(`ℹ️ Dijkstra finds shortest path with distance tracking`)
    }

    if (isStepMode) {
      setIsPaused(true)
      setCurrentStep(1) // Show the first step
      return // Let user control the rest
    }
    
    // Animate visited cells one by one for non-step mode
    for (let i = 0; i < solution.visitedCells.length; i++) {
      // Check if visualization was cancelled
      if (visualizationCancelledRef.current) {
        addLog(`⏹️ Visualization cancelled at step ${i + 1}/${solution.visitedCells.length}`)
        setIsVisualizing(false)
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 25)) // 25ms delay between steps
      setCurrentStep(i + 1)
    }
  }

  // Reset visualization
  const resetVisualization = () => {
    visualizationCancelledRef.current = true
    setVisualizedCells([])
    setShowOptimalPath(false)
    setIsVisualizing(false)
    setAlgorithmLogs([])
    setCurrentStep(0)
    setIsPaused(false)
    setTimeout(() => {
      addLog(`🔄 Visualization reset - Ready for new algorithm run`)
      visualizationCancelledRef.current = false
    }, 50)
  }

  // Handle keyboard input
  useEffect(() => {
    // Helper function to check if movement is allowed between two cells
    const canMoveBetween = (from: Pos, to: Pos): boolean => {
      if (currentLevel.cells) {
        // Use wall data if available
        const dr = to.r - from.r
        const dc = to.c - from.c
        
        if (dr === -1 && dc === 0) { // moving up
          return !currentLevel.cells[from.r][from.c].walls.top
        } else if (dr === 1 && dc === 0) { // moving down
          return !currentLevel.cells[from.r][from.c].walls.bottom
        } else if (dr === 0 && dc === -1) { // moving left
          return !currentLevel.cells[from.r][from.c].walls.left
        } else if (dr === 0 && dc === 1) { // moving right
          return !currentLevel.cells[from.r][from.c].walls.right
        }
        return false
      } else {
        // Fallback to binary grid
        return currentLevel.grid[to.r][to.c] === 0
      }
    }

    const handle = (e: KeyboardEvent) => {
      // Prevent handling during visualization to avoid conflicts
      if (isVisualizing) return
      
      const delta = DIR_KEY[e.key]
      if (!delta) return
      e.preventDefault()

      setPlayer(currentPlayer => {
        const next: Pos = { r: currentPlayer.r + delta.r, c: currentPlayer.c + delta.c }
        const rows = currentLevel.grid.length
        const cols = currentLevel.grid[0].length

        if (next.r < 0 || next.r >= rows || next.c < 0 || next.c >= cols) return currentPlayer
        if (!canMoveBetween(currentPlayer, next)) return currentPlayer

        setMoves(m => m + 1)
        return next
      })
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [currentLevel, isVisualizing])

  const isInPath = (pos: Pos) =>
    solution?.path.some(p => p.r === pos.r && p.c === pos.c)

  const reachedExit = (() => {
    if (currentLevel.cells) {
      // Check if we're at a border and can move outside through an opening
      const rows = currentLevel.grid.length
      const cols = currentLevel.grid[0].length
      if (player.r === 0 && !currentLevel.cells[player.r][player.c].walls.top) return true
      if (player.r === rows - 1 && !currentLevel.cells[player.r][player.c].walls.bottom) return true
      if (player.c === 0 && !currentLevel.cells[player.r][player.c].walls.left) return true
      if (player.c === cols - 1 && !currentLevel.cells[player.r][player.c].walls.right) return true
      return false
    } else {
      // Fallback: any border cell is an exit
      return (
        player.r === 0 ||
        player.r === currentLevel.grid.length - 1 ||
        player.c === 0 ||
        player.c === currentLevel.grid[0].length - 1
      ) && currentLevel.grid[player.r][player.c] === 0
    }
  })()

  const handleStepChange = (delta: number) => {
    if (!solution?.visitedCells) return
    const visitedCells = solution.visitedCells
    setCurrentStep(prev => {
      const newStep = prev + delta
      if (newStep < 0) return 0
      if (newStep >= visitedCells.length) return prev
      return newStep
    })
  }

  const handlePauseToggle = () => {
    setIsPaused(prev => !prev)
  }

  const logStep = (stepIndex: number) => {
    if (!solution?.visitedCells || !solution.detailedSteps || stepIndex < 0 || stepIndex >= solution.visitedCells.length) {
        return;
    }

    const cell = solution.visitedCells[stepIndex];
    const detailedStep = solution.detailedSteps?.[stepIndex];
    const i = stepIndex;

    const quarterMarks = [
        Math.floor(solution.visitedCells.length * 0.25),
        Math.floor(solution.visitedCells.length * 0.5),
        Math.floor(solution.visitedCells.length * 0.75)
    ];

    if (i === 0) {
        addLog(`🔍 Starting at (${cell.r}, ${cell.c})`);
    } else if (quarterMarks.includes(i)) {
        const percentage = Math.round(((i + 1) / solution.visitedCells.length) * 100);
        addLog(`📈 Progress: ${percentage}% complete (${i + 1}/${solution.visitedCells.length} cells)`);
    } else if (i > 0 && i % 15 === 0 && detailedStep) {
        const data = detailedStep.algorithmData;
        
        if (solution.algorithm === 'BFS') {
          addLog(`🔍 BFS: Queue=${data.queueSize}, Level=${data.currentLevel}, Exploring (${cell.r},${cell.c}), +${data.neighborsAdded} neighbors`)
        } else if (solution.algorithm === 'DFS') {
          const backtrack = data.isBacktracking ? ' [BACKTRACK]' : ''
          const deadEnd = data.deadEnd ? ' [DEAD END]' : ''
          addLog(`🌊 DFS: Depth=${data.stackDepth}, Exploring (${cell.r},${cell.c})${backtrack}${deadEnd}`)
        } else if (solution.algorithm === 'A*') {
          addLog(`⭐ A*: f=${data.fScore} (g=${data.gScore}+h=${data.hScore}), Open=${data.openSetSize}, Exploring (${cell.r},${cell.c})`)
        } else if (solution.algorithm === 'Dijkstra') {
          addLog(`📏 Dijkstra: dist=${data.currentDistance}, Queue=${data.priorityQueueSize}, Relaxed=${data.relaxationCount}, Exploring (${cell.r},${cell.c})`)
        }
    }

    if (stepIndex === solution.visitedCells.length - 1) {
        addLog(`✅ Algorithm completed! Explored ${solution.visitedCells.length} cells`);
        addLog(`📏 Optimal path length: ${solution.distance} steps`);
        const totalCells = currentLevel.grid.length * currentLevel.grid[0].length;
        const explorationPercentage = Math.round((solution.visitedCells.length / totalCells) * 100);
        addLog(`📊 Explored ${explorationPercentage}% of maze (${solution.visitedCells.length}/${totalCells} cells)`);
        
        setTimeout(() => {
            if (!visualizationCancelledRef.current) {
                setShowOptimalPath(true);
                addLog(`🎉 Visualization complete!`);
            }
            setIsVisualizing(false)
            setIsPaused(true)
        }, 500);
    }
  }

  useEffect(() => {
    if (!isVisualizing || !solution?.visitedCells) return;
    
    if(currentStep > 0 && currentStep <= solution.visitedCells.length) {
        setVisualizedCells(solution.visitedCells.slice(0, currentStep));
        logStep(currentStep - 1);
    } else if (currentStep === 0) {
        setVisualizedCells([]);
    }
  }, [currentStep, isVisualizing, solution]);

  useEffect(() => {
      if (isStepMode && isVisualizing && !isPaused) {
          if (solution?.visitedCells && currentStep >= solution.visitedCells.length) {
              setIsPaused(true);
              return;
          }

          const interval = setInterval(() => {
              handleStepChange(1);
          }, 25);

          return () => clearInterval(interval);
      }
  }, [isStepMode, isVisualizing, isPaused, currentStep, solution]);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#111827', color: 'white' }}>
      {/* Left Panel: Maze Visualization */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Maze Path-Finder</h1>
        <p style={{ marginBottom: '1rem', color: '#9CA3AF' }}>
          Use arrow keys to move the red dot. In 3D mode, use the mouse to rotate the camera.
        </p>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #374151', borderRadius: '0.5rem', backgroundColor: 'rgba(55, 65, 81, 0.2)' }}>
          {viewMode === '2D' ? (
            <Maze2D
              level={currentLevel}
              player={player}
              visualizedCells={visualizedCells}
              optimalPath={showOptimalPath ? solution?.path : undefined}
              aStarScores={solution?.aStarScores}
              showAStarScores={showAStarScores}
            />
          ) : (
            <MazeThree
              level={currentLevel}
              player={player}
              visualizedCells={visualizedCells}
              optimalPath={showOptimalPath ? solution?.path : []}
            />
          )}
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p>
            Algorithm: {solution?.algorithm} | Optimal distance: {solution?.distance} | Your moves: {moves}
          </p>
          <p>Cells explored by {solution?.algorithm}: {solution?.visitedCells?.length}</p>
        </div>
      </div>

      {/* Right Panel: Controls and Logs */}
      <div style={{ width: '24rem', display: 'flex', flexDirection: 'column', backgroundColor: '#1F2937', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflowY: 'auto' }}>
        <div style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Game Options</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="viewMode" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  View Mode
                </label>
                <select
                  id="viewMode"
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as '2D' | '3D')}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#374151', border: '1px solid #4B5563', color: 'white' }}
                >
                  <option value="2D">2D</option>
                  <option value="3D">3D</option>
                </select>
              </div>
              <div>
                <label htmlFor="mazeSize" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  Maze Size
                </label>
                <select
                  id="mazeSize"
                  value={mazeSize}
                  onChange={(e) => setMazeSize(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#374151', border: '1px solid #4B5563', color: 'white' }}
                >
                  <option value={9}>Tiny (9×9)</option>
                  <option value={11}>Small (11×11)</option>
                  <option value={13}>Small+ (13×13)</option>
                  <option value={15}>Medium (15×15)</option>
                  <option value={17}>Medium+ (17×17)</option>
                  <option value={21}>Large (21×21)</option>
                </select>
              </div>
              <div>
                <label htmlFor="difficulty" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'normal' | 'hard')}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#374151', border: '1px solid #4B5563', color: 'white' }}
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label htmlFor="algorithm" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  Pathfinding Algorithm
                </label>
                <select
                  id="algorithm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#374151', border: '1px solid #4B5563', color: 'white' }}
                >
                  <option value="bfs">BFS (Breadth-First Search)</option>
                  <option value="dfs">DFS (Depth-First Search)</option>
                  <option value="astar">A* (A-Star)</option>
                  <option value="dijkstra">Dijkstra</option>
                </select>
              </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1.5rem', marginBottom: '1rem' }}>Visualization</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={generateNewMaze}
                    style={{ width: '100%', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600', backgroundColor: '#059669', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                    New Maze
                </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={visualizeSolving}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '0.375rem', 
                  fontWeight: '600', 
                  backgroundColor: isVisualizing && !isPaused ? '#DC2626' : '#4F46E5', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  opacity: isVisualizing && isStepMode && !isPaused ? 0.5 : 1
                }}
                disabled={isVisualizing && isStepMode && !isPaused}
              >
                {isVisualizing && !isPaused ? 'Stop Visualization' : 'Visualize Solve'}
              </button>
              <button
                onClick={resetVisualization}
                style={{ width: '100%', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontWeight: '600', backgroundColor: '#4B5563', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="stepMode"
                checked={isStepMode}
                onChange={(e) => setIsStepMode(e.target.checked)}
                style={{ width: '1.25rem', height: '1.25rem' }}
              />
              <label htmlFor="stepMode" style={{ fontSize: '0.875rem' }}>Step-by-Step Mode</label>
            </div>

            {isStepMode && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => handleStepChange(-1)}
                    disabled={!isVisualizing || currentStep <= 0}
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.375rem', 
                      fontWeight: '600', 
                      backgroundColor: '#4B5563', 
                      color: 'white', 
                      border: 'none', 
                      cursor: 'pointer',
                      opacity: (!isVisualizing || currentStep <= 0) ? 0.5 : 1
                    }}
                >
                    Prev
                </button>
                <button
                    onClick={handlePauseToggle}
                    disabled={!isVisualizing}
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.375rem', 
                      fontWeight: '600', 
                      backgroundColor: '#D97706', 
                      color: 'white', 
                      border: 'none', 
                      cursor: 'pointer',
                      opacity: !isVisualizing ? 0.5 : 1
                    }}
                >
                    {isPaused ? 'Play' : 'Pause'}
                </button>
                <button
                    onClick={() => handleStepChange(1)}
                    disabled={!isVisualizing || !solution?.visitedCells || currentStep >= solution.visitedCells.length - 1}
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.375rem', 
                      fontWeight: '600', 
                      backgroundColor: '#4B5563', 
                      color: 'white', 
                      border: 'none', 
                      cursor: 'pointer',
                      opacity: (!isVisualizing || !solution?.visitedCells || currentStep >= solution.visitedCells.length - 1) ? 0.5 : 1
                    }}
                >
                    Next
                </button>
            </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    id="showAStarScores"
                    checked={showAStarScores}
                    onChange={(e) => setShowAStarScores(e.target.checked)}
                    style={{ width: '1.25rem', height: '1.25rem' }}
                    disabled={algorithm !== 'astar'}
                />
                <label htmlFor="showAStarScores" style={{ fontSize: '0.875rem', color: algorithm !== 'astar' ? '#6B7280' : 'white' }}>
                    Show A* Scores
                </label>
            </div>
        </div>

        <div style={{ padding: '1.5rem', paddingTop: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Algorithm Log</h2>
            <div
              ref={logContainerRef}
              style={{ 
                flex: 1, 
                backgroundColor: 'rgba(17, 24, 39, 0.5)', 
                borderRadius: '0.375rem', 
                padding: '1rem', 
                overflowY: 'auto', 
                fontFamily: 'monospace', 
                fontSize: '0.875rem' 
              }}
            >
              {algorithmLogs.map((log, index) => (
                <div key={index} style={{ whiteSpace: 'pre-wrap' }}>
                  {log}
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  )
}

export default App
