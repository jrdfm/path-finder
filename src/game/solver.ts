// Minimal BFS solver to exit any border in the fewest steps
// Walls = '#', empty = ' '

export type Pos = { r: number; c: number }

// Cell with individual wall flags like pymaze
export interface MazeCell {
  walls: {
    top: boolean
    right: boolean  
    bottom: boolean
    left: boolean
  }
  visited: boolean
}

export interface Level {
  grid: number[][]; // 0 = empty, 1 = wall
  start: Pos
  cells?: MazeCell[][] // Optional wall data for rendering
}

export interface Solution {
  distance: number
  path: Pos[]
  visitedCells?: Pos[] // For visualization
  algorithm?: string
  detailedSteps?: DetailedStep[] // Enhanced logging information
  // A* specific visualization data
  aStarScores?: {
    gScores: number[][]
    hScores: number[][]
    fScores: number[][]
  }
}

export type Algorithm = 'bfs' | 'dfs' | 'astar' | 'dijkstra'

// Visualization step for animated pathfinding
export interface VisualizationStep {
  current: Pos
  visited: Pos[]
  frontier: Pos[]
  path?: Pos[]
}

// Enhanced step information for educational logging
export interface DetailedStep {
  position: Pos
  stepNumber: number
  algorithmData: {
    // BFS specific
    queueSize?: number
    currentLevel?: number
    neighborsAdded?: number
    
    // DFS specific  
    stackDepth?: number
    isBacktracking?: boolean
    deadEnd?: boolean
    
    // A* specific
    gScore?: number
    hScore?: number
    fScore?: number
    openSetSize?: number
    
    // Dijkstra specific
    currentDistance?: number
    relaxationCount?: number
    priorityQueueSize?: number
  }
}

const DIRS: Pos[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
]

// Heuristic for A* (Manhattan distance to nearest border)
const heuristic = (pos: Pos, rows: number, cols: number): number => {
  return Math.min(pos.r, pos.c, rows - 1 - pos.r, cols - 1 - pos.c)
}

export function solve(level: Level, algorithm: Algorithm = 'bfs'): Solution | null {
  switch (algorithm) {
    case 'bfs':
      return solveBFS(level)
    case 'dfs':
      return solveDFS(level)
    case 'astar':
      return solveAStar(level)
    case 'dijkstra':
      return solveDijkstra(level)
    default:
      return solveBFS(level)
  }
}

function solveBFS(level: Level): Solution | null {
  const rows = level.grid.length
  const cols = level.grid[0].length

  const visited: Array<Array<number | null>> = Array.from({ length: rows }, () =>
    Array(cols).fill(null),
  )

  const visitedCells: Pos[] = []
  const detailedSteps: DetailedStep[] = []
  const queue: Pos[] = []
  queue.push(level.start)
  visited[level.start.r][level.start.c] = -1
  let stepNumber = 0

  // Helper function to check if movement is allowed between two cells
  const canMoveBetween = (from: Pos, to: Pos): boolean => {
    if (level.cells) {
      // Use wall data if available
      const dr = to.r - from.r
      const dc = to.c - from.c
      
      if (dr === -1 && dc === 0) { // moving up
        return !level.cells[from.r][from.c].walls.top
      } else if (dr === 1 && dc === 0) { // moving down
        return !level.cells[from.r][from.c].walls.bottom
      } else if (dr === 0 && dc === -1) { // moving left
        return !level.cells[from.r][from.c].walls.left
      } else if (dr === 0 && dc === 1) { // moving right
        return !level.cells[from.r][from.c].walls.right
      }
      return false
    } else {
      // Fallback to binary grid
      return level.grid[to.r][to.c] === 0
    }
  }

  while (queue.length) {
    const cur = queue.shift()!
    visitedCells.push(cur)
    
    // Calculate current level (distance from start)
    let currentLevel = 0
    let temp = cur
    while (visited[temp.r][temp.c] !== -1) {
      const prevIdx = visited[temp.r][temp.c]!
      temp = { r: Math.floor(prevIdx / cols), c: prevIdx % cols }
      currentLevel++
    }
    
    let neighborsAdded = 0

    // Check if we can actually exit the maze from this position
    let canExit = false
    if (level.cells) {
      // Check if we're at a border and can move outside through an opening
      if (cur.r === 0 && !level.cells[cur.r][cur.c].walls.top) canExit = true
      else if (cur.r === rows - 1 && !level.cells[cur.r][cur.c].walls.bottom) canExit = true
      else if (cur.c === 0 && !level.cells[cur.r][cur.c].walls.left) canExit = true
      else if (cur.c === cols - 1 && !level.cells[cur.r][cur.c].walls.right) canExit = true
    } else {
      // Fallback: any border cell is an exit
      canExit = (cur.r === 0 || cur.c === 0 || cur.r === rows - 1 || cur.c === cols - 1)
    }
    
    if (canExit) {
      const path: Pos[] = []
      let p = cur
      while (true) {
        path.push(p)
        const prevIdx = visited[p.r][p.c]!
        if (prevIdx === -1) break
        p = { r: Math.floor(prevIdx / cols), c: prevIdx % cols }
      }
      path.reverse()
      return { distance: path.length - 1, path, visitedCells, algorithm: 'BFS', detailedSteps }
    }

    for (const d of DIRS) {
      const nxt: Pos = { r: cur.r + d.r, c: cur.c + d.c }
      if (nxt.r < 0 || nxt.r >= rows || nxt.c < 0 || nxt.c >= cols) continue
      if (!canMoveBetween(cur, nxt)) continue
      if (visited[nxt.r][nxt.c] !== null) continue
      visited[nxt.r][nxt.c] = cur.r * cols + cur.c
      queue.push(nxt)
      neighborsAdded++
    }
    
    // Add detailed step information
    detailedSteps.push({
      position: cur,
      stepNumber: stepNumber++,
      algorithmData: {
        queueSize: queue.length,
        currentLevel: currentLevel,
        neighborsAdded: neighborsAdded
      }
    })
  }
  return null
}

function solveDFS(level: Level): Solution | null {
  const rows = level.grid.length
  const cols = level.grid[0].length

  const visited: Array<Array<boolean>> = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  )

  const visitedCells: Pos[] = []
  const detailedSteps: DetailedStep[] = []
  let stepNumber = 0
  const parent: Array<Array<Pos | null>> = Array.from({ length: rows }, () =>
    Array(cols).fill(null),
  )

  // Helper function to check if movement is allowed between two cells
  const canMoveBetween = (from: Pos, to: Pos): boolean => {
    if (level.cells) {
      const dr = to.r - from.r
      const dc = to.c - from.c
      
      if (dr === -1 && dc === 0) return !level.cells[from.r][from.c].walls.top
      else if (dr === 1 && dc === 0) return !level.cells[from.r][from.c].walls.bottom
      else if (dr === 0 && dc === -1) return !level.cells[from.r][from.c].walls.left
      else if (dr === 0 && dc === 1) return !level.cells[from.r][from.c].walls.right
      return false
    } else {
      return level.grid[to.r][to.c] === 0
    }
  }

  const dfs = (pos: Pos): Pos | null => {
    visited[pos.r][pos.c] = true
    visitedCells.push(pos)
    
    // Calculate stack depth by counting visited cells in current path
    let stackDepth = 0
    let current: Pos | null = pos
    while (current && parent[current.r][current.c]) {
      stackDepth++
      current = parent[current.r][current.c]
    }

    // Check if we can exit
    let canExit = false
    if (level.cells) {
      if (pos.r === 0 && !level.cells[pos.r][pos.c].walls.top) canExit = true
      else if (pos.r === rows - 1 && !level.cells[pos.r][pos.c].walls.bottom) canExit = true
      else if (pos.c === 0 && !level.cells[pos.r][pos.c].walls.left) canExit = true
      else if (pos.c === cols - 1 && !level.cells[pos.r][pos.c].walls.right) canExit = true
    } else {
      canExit = (pos.r === 0 || pos.c === 0 || pos.r === rows - 1 || pos.c === cols - 1)
    }

    if (canExit) return pos

    let validNeighbors = 0
    for (const d of DIRS) {
      const nxt: Pos = { r: pos.r + d.r, c: pos.c + d.c }
      if (nxt.r < 0 || nxt.r >= rows || nxt.c < 0 || nxt.c >= cols) continue
      if (!canMoveBetween(pos, nxt)) continue
      if (visited[nxt.r][nxt.c]) continue
      validNeighbors++
      
      parent[nxt.r][nxt.c] = pos
      const result = dfs(nxt)
      if (result) return result
    }
    
    // This is a dead end if no valid neighbors
    const isDeadEnd = validNeighbors === 0
    
    // Add detailed step information
    detailedSteps.push({
      position: pos,
      stepNumber: stepNumber++,
      algorithmData: {
        stackDepth: stackDepth,
        isBacktracking: false, // Will be true when we return from recursion
        deadEnd: isDeadEnd
      }
    })

    return null
  }

  const exitPos = dfs(level.start)
  if (!exitPos) return null

  // Reconstruct path
  const path: Pos[] = []
  let current: Pos | null = exitPos
  while (current) {
    path.push(current)
    current = parent[current.r][current.c]
  }
  path.reverse()

  return { distance: path.length - 1, path, visitedCells, algorithm: 'DFS', detailedSteps }
}

function solveAStar(level: Level): Solution | null {
  const rows = level.grid.length
  const cols = level.grid[0].length

  const visited: Array<Array<boolean>> = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  )

  const visitedCells: Pos[] = []
  const detailedSteps: DetailedStep[] = []
  let stepNumber = 0
  const gScore: Array<Array<number>> = Array.from({ length: rows }, () =>
    Array(cols).fill(Infinity),
  )
  const fScore: Array<Array<number>> = Array.from({ length: rows }, () =>
    Array(cols).fill(Infinity),
  )
  const parent: Array<Array<Pos | null>> = Array.from({ length: rows }, () =>
    Array(cols).fill(null),
  )

  // Priority queue (simple implementation)
  const openSet: Pos[] = []
  
  gScore[level.start.r][level.start.c] = 0
  fScore[level.start.r][level.start.c] = heuristic(level.start, rows, cols)
  openSet.push(level.start)

  const canMoveBetween = (from: Pos, to: Pos): boolean => {
    if (level.cells) {
      const dr = to.r - from.r
      const dc = to.c - from.c
      
      if (dr === -1 && dc === 0) return !level.cells[from.r][from.c].walls.top
      else if (dr === 1 && dc === 0) return !level.cells[from.r][from.c].walls.bottom
      else if (dr === 0 && dc === -1) return !level.cells[from.r][from.c].walls.left
      else if (dr === 0 && dc === 1) return !level.cells[from.r][from.c].walls.right
      return false
    } else {
      return level.grid[to.r][to.c] === 0
    }
  }

  while (openSet.length > 0) {
    // Find node with lowest fScore
    let current = openSet[0]
    let currentIndex = 0
    for (let i = 1; i < openSet.length; i++) {
      if (fScore[openSet[i].r][openSet[i].c] < fScore[current.r][current.c]) {
        current = openSet[i]
        currentIndex = i
      }
    }
    
    openSet.splice(currentIndex, 1)
    visited[current.r][current.c] = true
    visitedCells.push(current)

    // Add detailed step information
    const currentG = gScore[current.r][current.c]
    const currentH = heuristic(current, rows, cols)
    const currentF = fScore[current.r][current.c]
    
    detailedSteps.push({
      position: current,
      stepNumber: stepNumber++,
      algorithmData: {
        gScore: currentG,
        hScore: currentH,
        fScore: currentF,
        openSetSize: openSet.length
      }
    })

    // Check if we can exit
    let canExit = false
    if (level.cells) {
      if (current.r === 0 && !level.cells[current.r][current.c].walls.top) canExit = true
      else if (current.r === rows - 1 && !level.cells[current.r][current.c].walls.bottom) canExit = true
      else if (current.c === 0 && !level.cells[current.r][current.c].walls.left) canExit = true
      else if (current.c === cols - 1 && !level.cells[current.r][current.c].walls.right) canExit = true
    } else {
      canExit = (current.r === 0 || current.c === 0 || current.r === rows - 1 || current.c === cols - 1)
    }

    if (canExit) {
      // Reconstruct path
      const path: Pos[] = []
      let pos: Pos | null = current
      while (pos) {
        path.push(pos)
        pos = parent[pos.r][pos.c]
      }
      path.reverse()
      
      // Convert score arrays to regular arrays for visualization
      const gScoresArray = gScore.map(row => [...row])
      const fScoresArray = fScore.map(row => [...row])
      const hScoresArray = gScore.map((row, r) => 
        row.map((_, c) => heuristic({ r, c }, rows, cols))
      )
      
      return { 
        distance: path.length - 1, 
        path, 
        visitedCells, 
        algorithm: 'A*', 
        detailedSteps,
        aStarScores: {
          gScores: gScoresArray,
          hScores: hScoresArray,
          fScores: fScoresArray
        }
      }
    }

    for (const d of DIRS) {
      const neighbor: Pos = { r: current.r + d.r, c: current.c + d.c }
      if (neighbor.r < 0 || neighbor.r >= rows || neighbor.c < 0 || neighbor.c >= cols) continue
      if (!canMoveBetween(current, neighbor)) continue
      if (visited[neighbor.r][neighbor.c]) continue

      const tentativeGScore = gScore[current.r][current.c] + 1

      if (tentativeGScore < gScore[neighbor.r][neighbor.c]) {
        parent[neighbor.r][neighbor.c] = current
        gScore[neighbor.r][neighbor.c] = tentativeGScore
        fScore[neighbor.r][neighbor.c] = gScore[neighbor.r][neighbor.c] + heuristic(neighbor, rows, cols)
        
        if (!openSet.some(pos => pos.r === neighbor.r && pos.c === neighbor.c)) {
          openSet.push(neighbor)
        }
      }
    }
  }

  return null
}

function solveDijkstra(level: Level): Solution | null {
  const rows = level.grid.length
  const cols = level.grid[0].length

  const visited: Array<Array<boolean>> = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  )

  const visitedCells: Pos[] = []
  const detailedSteps: DetailedStep[] = []
  let stepNumber = 0
  const distance: Array<Array<number>> = Array.from({ length: rows }, () =>
    Array(cols).fill(Infinity),
  )
  const parent: Array<Array<Pos | null>> = Array.from({ length: rows }, () =>
    Array(cols).fill(null),
  )

  // Priority queue (simple implementation)
  const queue: Pos[] = []
  
  distance[level.start.r][level.start.c] = 0
  queue.push(level.start)

  const canMoveBetween = (from: Pos, to: Pos): boolean => {
    if (level.cells) {
      const dr = to.r - from.r
      const dc = to.c - from.c
      
      if (dr === -1 && dc === 0) return !level.cells[from.r][from.c].walls.top
      else if (dr === 1 && dc === 0) return !level.cells[from.r][from.c].walls.bottom
      else if (dr === 0 && dc === -1) return !level.cells[from.r][from.c].walls.left
      else if (dr === 0 && dc === 1) return !level.cells[from.r][from.c].walls.right
      return false
    } else {
      return level.grid[to.r][to.c] === 0
    }
  }

  while (queue.length > 0) {
    // Find node with minimum distance
    let current = queue[0]
    let currentIndex = 0
    for (let i = 1; i < queue.length; i++) {
      if (distance[queue[i].r][queue[i].c] < distance[current.r][current.c]) {
        current = queue[i]
        currentIndex = i
      }
    }
    
    queue.splice(currentIndex, 1)
    visited[current.r][current.c] = true
    visitedCells.push(current)

    let relaxationCount = 0

    // Check if we can exit
    let canExit = false
    if (level.cells) {
      if (current.r === 0 && !level.cells[current.r][current.c].walls.top) canExit = true
      else if (current.r === rows - 1 && !level.cells[current.r][current.c].walls.bottom) canExit = true
      else if (current.c === 0 && !level.cells[current.r][current.c].walls.left) canExit = true
      else if (current.c === cols - 1 && !level.cells[current.r][current.c].walls.right) canExit = true
    } else {
      canExit = (current.r === 0 || current.c === 0 || current.r === rows - 1 || current.c === cols - 1)
    }

    if (canExit) {
      // Reconstruct path
      const path: Pos[] = []
      let pos: Pos | null = current
      while (pos) {
        path.push(pos)
        pos = parent[pos.r][pos.c]
      }
      path.reverse()
      return { distance: path.length - 1, path, visitedCells, algorithm: 'Dijkstra', detailedSteps }
    }

    for (const d of DIRS) {
      const neighbor: Pos = { r: current.r + d.r, c: current.c + d.c }
      if (neighbor.r < 0 || neighbor.r >= rows || neighbor.c < 0 || neighbor.c >= cols) continue
      if (!canMoveBetween(current, neighbor)) continue
      if (visited[neighbor.r][neighbor.c]) continue

      const newDistance = distance[current.r][current.c] + 1

      if (newDistance < distance[neighbor.r][neighbor.c]) {
        distance[neighbor.r][neighbor.c] = newDistance
        parent[neighbor.r][neighbor.c] = current
        relaxationCount++
        
        if (!queue.some(pos => pos.r === neighbor.r && pos.c === neighbor.c)) {
          queue.push(neighbor)
        }
      }
    }
    
    // Add detailed step information
    detailedSteps.push({
      position: current,
      stepNumber: stepNumber++,
      algorithmData: {
        currentDistance: distance[current.r][current.c],
        relaxationCount: relaxationCount,
        priorityQueueSize: queue.length
      }
    })
  }

  return null
} 