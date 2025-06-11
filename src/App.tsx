import { useEffect, useState, useRef } from 'react'
import { generateMaze } from './game/mazeGenerator'
import { solve } from './game/solver'
import type { Pos, Algorithm } from './game/solver'
import './App.css'
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
      addLog(`⏹️ Visualization stopped by user`)
      return
    }
    
    setIsVisualizing(true)
    visualizationCancelledRef.current = false
    setVisualizedCells([])
    setShowOptimalPath(false)
    
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
    
    // Animate visited cells one by one
    let quarterMarks = [
      Math.floor(solution.visitedCells.length * 0.25),
      Math.floor(solution.visitedCells.length * 0.5),
      Math.floor(solution.visitedCells.length * 0.75)
    ]
    
    for (let i = 0; i < solution.visitedCells.length; i++) {
      // Check if visualization was cancelled
      if (visualizationCancelledRef.current) {
        addLog(`⏹️ Visualization cancelled at step ${i + 1}/${solution.visitedCells.length}`)
        setIsVisualizing(false)
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 25)) // 25ms delay between steps
      setVisualizedCells(solution.visitedCells.slice(0, i + 1))
      
      const cell = solution.visitedCells[i]
      const detailedStep = solution.detailedSteps?.[i]
      
      if (i === 0) {
        addLog(`🔍 Starting at (${cell.r}, ${cell.c})`)
      } else if (quarterMarks.includes(i)) {
        const percentage = Math.round(((i + 1) / solution.visitedCells.length) * 100)
        addLog(`📈 Progress: ${percentage}% complete (${i + 1}/${solution.visitedCells.length} cells)`)
      } else if (i % 15 === 0 && i > 0 && detailedStep) { // Log every 15th cell with algorithm details
        const data = detailedStep.algorithmData
        
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
    }
    
    addLog(`✅ Algorithm completed! Explored ${solution.visitedCells.length} cells`)
    addLog(`📏 Optimal path length: ${solution.distance} steps`)
    
    // Calculate efficiency metric
    const totalCells = currentLevel.grid.length * currentLevel.grid[0].length
    const explorationPercentage = Math.round((solution.visitedCells.length / totalCells) * 100)
    addLog(`📊 Explored ${explorationPercentage}% of maze (${solution.visitedCells.length}/${totalCells} cells)`)
    
    // Show the optimal path after exploration is complete
    await new Promise(resolve => setTimeout(resolve, 500))
    setShowOptimalPath(true)
    setIsVisualizing(false)
    addLog(`🎉 Visualization complete!`)
  }

  // Reset visualization
  const resetVisualization = () => {
    visualizationCancelledRef.current = true
    setVisualizedCells([])
    setShowOptimalPath(false)
    setIsVisualizing(false)
    setAlgorithmLogs([])
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
        player.c === 0 ||
        player.r === currentLevel.grid.length - 1 ||
        player.c === currentLevel.grid[0].length - 1
      )
    }
  })()

  return (
    <div style={{ fontFamily: 'monospace', padding: '1rem' }}>
      <h2>Maze Path-Finder</h2>
      
      {/* Main game layout with maze on left and options on right */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', maxWidth: '100%' }}>
        {/* Maze section */}
        <div style={{ flex: '1 1 auto', minWidth: '0' }}>
          <MazeThree 
            level={currentLevel} 
            player={player} 
            visualizedCells={visualizedCells}
            optimalPath={showOptimalPath ? solution?.path : undefined}
            aStarScores={solution?.aStarScores}
            showAStarScores={showAStarScores && solution?.algorithm === 'A*'}
          />
          <p>Use arrow keys to move the red dot. Black squares are walls.</p>
        </div>
        
        {/* Right side panel with options and log */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          flex: '0 0 auto',
          width: Math.max(250, Math.min(320, mazeSize * 12)) + 'px'
        }}>
          {/* Options Menu */}
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#2c3e50',
            color: 'white',
            borderRadius: '8px',
            width: Math.max(250, Math.min(320, mazeSize * 12)) + 'px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#ecf0f1' }}>Game Options</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="maze-size" style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#bdc3c7',
                  fontSize: '0.9rem'
                }}>
                  Maze Size:
                </label>
                <select 
                  id="maze-size"
                  value={mazeSize} 
                  onChange={(e) => setMazeSize(Number(e.target.value))}
                  style={{ 
                    padding: '0.5rem', 
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #34495e',
                    backgroundColor: '#34495e',
                    color: 'white'
                  }}
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
                <label htmlFor="difficulty" style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#bdc3c7',
                  fontSize: '0.9rem'
                }}>
                  Difficulty:
                </label>
                <select 
                  id="difficulty"
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'normal' | 'hard')}
                  style={{ 
                    padding: '0.5rem', 
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #34495e',
                    backgroundColor: '#34495e',
                    color: 'white'
                  }}
                >
                  <option value="easy">Easy (More direct paths)</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard (More complex)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="algorithm" style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: '#bdc3c7',
                  fontSize: '0.9rem'
                }}>
                  Pathfinding Algorithm:
                </label>
                <select 
                  id="algorithm"
                  value={algorithm} 
                  onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
                  style={{ 
                    padding: '0.5rem', 
                    width: '100%',
                    borderRadius: '4px',
                    border: '1px solid #34495e',
                    backgroundColor: '#34495e',
                    color: 'white'
                  }}
                >
                  <option value="bfs">BFS (Breadth-First Search)</option>
                  <option value="dfs">DFS (Depth-First Search)</option>
                  <option value="astar">A* (A-Star)</option>
                  <option value="dijkstra">Dijkstra's Algorithm</option>
                </select>
              </div>
              
              {/* A* Score Visualization Toggle */}
              {solution?.algorithm === 'A*' && (
                <div>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#bdc3c7',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="checkbox"
                      checked={showAStarScores}
                      onChange={(e) => setShowAStarScores(e.target.checked)}
                      style={{ 
                        transform: 'scale(1.2)',
                        accentColor: '#3498db'
                      }}
                    />
                    ⭐ Show A* Scores (f, g, h)
                  </label>
                </div>
              )}
              
              <button 
                onClick={generateNewMaze}
                style={{ 
                  padding: '0.75rem 1rem', 
                  backgroundColor: '#e74c3c', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  marginTop: '0.5rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
              >
                🎲 Generate New Maze
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={visualizeSolving}
                  disabled={!solution}
                  style={{ 
                    flex: 1,
                    padding: '0.75rem 1rem', 
                    backgroundColor: isVisualizing ? '#e74c3c' : '#27ae60', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: !solution ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (solution) {
                      e.currentTarget.style.backgroundColor = isVisualizing ? '#c0392b' : '#229954'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (solution) {
                      e.currentTarget.style.backgroundColor = isVisualizing ? '#e74c3c' : '#27ae60'
                    }
                  }}
                >
                  {isVisualizing ? '⏹️ Stop' : '🎯 Visualize Solve'}
                </button>
                
                <button 
                  onClick={resetVisualization}
                  disabled={isVisualizing}
                  style={{ 
                    flex: 1,
                    padding: '0.75rem 1rem', 
                    backgroundColor: isVisualizing ? '#95a5a6' : '#f39c12', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: isVisualizing ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isVisualizing) {
                      e.currentTarget.style.backgroundColor = '#e67e22'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isVisualizing) {
                      e.currentTarget.style.backgroundColor = '#f39c12'
                    }
                  }}
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          </div>
          
          {/* Algorithm Log Window */}
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#1a252f',
            color: '#ecf0f1',
            borderRadius: '8px',
            width: Math.max(250, Math.min(320, mazeSize * 12)) + 'px',
            height: '300px',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '0.8rem',
            border: '1px solid #34495e'
          }}>
            <h4 style={{ 
              margin: '0 0 0.75rem 0', 
              fontSize: '1rem', 
              color: '#3498db',
              borderBottom: '1px solid #34495e',
              paddingBottom: '0.5rem'
            }}>
              🔍 Algorithm Log
            </h4>
            
            <div style={{ 
              height: '240px', 
              overflowY: 'auto',
              scrollBehavior: 'smooth'
            }}
            ref={logContainerRef}
            >
              {algorithmLogs.length === 0 ? (
                <div style={{ 
                  color: '#7f8c8d', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '2rem 0'
                }}>
                  Click "Visualize Solve" to see algorithm logs...
                </div>
              ) : (
                algorithmLogs.map((log, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      marginBottom: '0.25rem',
                      padding: '0.25rem 0',
                      borderLeft: log.includes('🚀') ? '3px solid #e74c3c' :
                                 log.includes('✅') ? '3px solid #27ae60' :
                                 log.includes('🎉') ? '3px solid #f39c12' :
                                 '3px solid transparent',
                      paddingLeft: '0.5rem',
                      lineHeight: '1.3'
                    }}
                  >
                    {(() => {
                      const colonIndex = log.indexOf(': ')
                      if (colonIndex !== -1) {
                        const timestamp = log.substring(0, colonIndex)
                        const message = log.substring(colonIndex + 2)
                        return (
                          <>
                            <span style={{ fontSize: '0.7rem', color: '#7f8c8d', opacity: 0.8 }}>
                              {timestamp}
                            </span>
                            <span style={{ fontWeight: 'bold', marginLeft: '0.5rem' }}>
                              {message}
                            </span>
                          </>
                        )
                      }
                      return <span style={{ fontWeight: 'bold' }}>{log}</span>
                    })()}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <p>
          <strong>Algorithm:</strong> {solution?.algorithm || 'None'} | 
          <strong> Optimal distance:</strong> {solution ? solution.distance : 'unreachable'} | 
          <strong> Your moves:</strong> {moves}
        </p>
        {solution?.visitedCells && (
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Cells explored by {solution.algorithm}: {solution.visitedCells.length}
          </p>
        )}
      </div>

      {reachedExit && <p style={{ color: 'green' }}>🎉 You escaped the grid!</p>}
    </div>
  )
}

export default App
