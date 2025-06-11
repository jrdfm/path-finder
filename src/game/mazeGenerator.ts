import type { Level, Pos, MazeCell } from './solver'

// Generate a proper maze using recursive backtracking
export function generateMaze(width: number, height: number, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): Level {
  // Create grid of cells with all walls initially present
  const cells: MazeCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => ({
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false
    }))
  )

  // Generate maze using recursive backtracking
  const stack: Pos[] = []
  
  // Start from a random interior cell
  const start: Pos = difficulty === 'easy' 
    ? { r: 1, c: 1 } // Easy: start from corner for more direct paths
    : { r: Math.floor(height / 2), c: Math.floor(width / 2) } // Normal/Hard: start from center
  cells[start.r][start.c].visited = true
  stack.push(start)

  // Adjacent cell directions (not skipping cells)
  const directions = [
    { r: -1, c: 0 }, // up
    { r: 1, c: 0 },  // down  
    { r: 0, c: -1 }, // left
    { r: 0, c: 1 }   // right
  ]

  // Difficulty affects choice randomness
  const getRandomNeighbor = (neighbors: Pos[]): Pos => {
    if (difficulty === 'easy') {
      // Easy: prefer neighbors that lead toward edges (more direct paths)
      const edgeNeighbors = neighbors.filter(n => 
        n.r < height / 3 || n.r > (2 * height) / 3 || 
        n.c < width / 3 || n.c > (2 * width) / 3
      )
      if (edgeNeighbors.length > 0 && Math.random() < 0.7) {
        return edgeNeighbors[Math.floor(Math.random() * edgeNeighbors.length)]
      }
    } else if (difficulty === 'hard') {
      // Hard: add some bias toward creating longer paths
      if (Math.random() < 0.3) {
        // Sometimes choose the neighbor furthest from edges
        const centerNeighbors = neighbors.filter(n => 
          n.r > height / 4 && n.r < (3 * height) / 4 && 
          n.c > width / 4 && n.c < (3 * width) / 4
        )
        if (centerNeighbors.length > 0) {
          return centerNeighbors[Math.floor(Math.random() * centerNeighbors.length)]
        }
      }
    }
    // Normal difficulty or fallback: completely random
    return neighbors[Math.floor(Math.random() * neighbors.length)]
  }

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors: Pos[] = []

    // Find unvisited neighbors
    for (const dir of directions) {
      const next: Pos = { r: current.r + dir.r, c: current.c + dir.c }
      
      if (next.r >= 0 && next.r < height && 
          next.c >= 0 && next.c < width &&
          !cells[next.r][next.c].visited) {
        neighbors.push(next)
      }
    }

    if (neighbors.length > 0) {
      // Choose neighbor based on difficulty
      const next = getRandomNeighbor(neighbors)
      
      // Remove walls between current and next cell
      if (next.r < current.r) { // next is above current
        cells[current.r][current.c].walls.top = false
        cells[next.r][next.c].walls.bottom = false
      } else if (next.r > current.r) { // next is below current
        cells[current.r][current.c].walls.bottom = false
        cells[next.r][next.c].walls.top = false
      } else if (next.c < current.c) { // next is left of current
        cells[current.r][current.c].walls.left = false
        cells[next.r][next.c].walls.right = false
      } else if (next.c > current.c) { // next is right of current
        cells[current.r][current.c].walls.right = false
        cells[next.r][next.c].walls.left = false
      }
      
      cells[next.r][next.c].visited = true
      stack.push(next)
    } else {
      stack.pop()
    }
  }

  // Create exit by removing top wall of a cell in top row
  cells[0][1].walls.top = false

  // Convert cells to binary grid for compatibility with existing solver
  const grid: number[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      // A cell is a "passage" if it was visited during maze generation
      // A cell is a "wall" if it was never visited (remains isolated)
      return cells[r][c].visited ? 0 : 1
    })
  )

  // Generate random starting position based on difficulty
  const getRandomStartPosition = (): Pos => {
    const validCells: Pos[] = []
    
    // Find all valid (non-wall) cells
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (cells[r][c].visited) { // Only passable cells
          validCells.push({ r, c })
        }
      }
    }
    
    if (difficulty === 'easy') {
      // Easy: Start closer to the exit (top half of maze)
      const topHalfCells = validCells.filter(pos => pos.r < height / 2)
      if (topHalfCells.length > 0) {
        return topHalfCells[Math.floor(Math.random() * topHalfCells.length)]
      }
    } else if (difficulty === 'hard') {
      // Hard: Start farther from exit (bottom half of maze)
      const bottomHalfCells = validCells.filter(pos => pos.r >= height / 2)
      if (bottomHalfCells.length > 0) {
        return bottomHalfCells[Math.floor(Math.random() * bottomHalfCells.length)]
      }
    }
    
    // Normal difficulty or fallback: completely random valid position
    return validCells[Math.floor(Math.random() * validCells.length)]
  }

  return {
    grid,
    start: getRandomStartPosition(),
    cells // Include cell wall data for rendering
  }
} 