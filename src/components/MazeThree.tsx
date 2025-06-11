import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import type { Level, Pos } from '../game/solver'

interface Props {
  level: Level
  player: Pos
  cell?: number // pixel size per cell, default 40
  visualizedCells?: Pos[] // Cells explored during algorithm visualization
  optimalPath?: Pos[] // Optimal path to highlight
  aStarScores?: {
    gScores: number[][]
    hScores: number[][]
    fScores: number[][]
  }
  showAStarScores?: boolean
}

export default function MazeThree({ level, player, cell = 40, visualizedCells = [], optimalPath, aStarScores, showAStarScores = false }: Props) {
  const gameRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Phaser.Game | null>(null)
  const playerSpriteRef = useRef<Phaser.GameObjects.Graphics | null>(null)
  const visualizationGraphicsRef = useRef<Phaser.GameObjects.Graphics | null>(null)

  useEffect(() => {
    if (!gameRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: level.grid[0].length * cell,
      height: level.grid.length * cell,
      parent: gameRef.current,
      backgroundColor: '#ffffff',
      scene: {
        create: function() {
          const scene = this as Phaser.Scene
          
          // Draw maze walls as proper line segments
          const graphics = scene.add.graphics()
          graphics.lineStyle(4, 0x000000)

          // Use pymaze-style wall rendering if cell data is available
          if (level.cells) {
            for (let r = 0; r < level.cells.length; r++) {
              for (let c = 0; c < level.cells[0].length; c++) {
                const x = c * cell
                const y = r * cell
                const cellWalls = level.cells[r][c].walls
                
                // Draw walls exactly like pymaze does
                if (cellWalls.top) {
                  graphics.moveTo(x, y)
                  graphics.lineTo(x + cell, y)
                  graphics.strokePath()
                }
                if (cellWalls.right) {
                  graphics.moveTo(x + cell, y)
                  graphics.lineTo(x + cell, y + cell)
                  graphics.strokePath()
                }
                if (cellWalls.bottom) {
                  graphics.moveTo(x + cell, y + cell)
                  graphics.lineTo(x, y + cell)
                  graphics.strokePath()
                }
                if (cellWalls.left) {
                  graphics.moveTo(x, y + cell)
                  graphics.lineTo(x, y)
                  graphics.strokePath()
                }
              }
            }
          } else {
            // Fallback to old rendering method
            for (let r = 0; r < level.grid.length; r++) {
              for (let c = 0; c < level.grid[0].length; c++) {
                if (level.grid[r][c] === 1) {
                  const x = c * cell
                  const y = r * cell
                  graphics.fillStyle(0x000000)
                  graphics.fillRect(x, y, cell, cell)
                }
              }
            }
          }
          
          // Create player sprite
          const playerSprite = scene.add.graphics()
          playerSprite.fillStyle(0xff0000)
          playerSprite.fillCircle(0, 0, Math.min(cell / 3, 12))
          playerSprite.x = player.c * cell + cell / 2
          playerSprite.y = player.r * cell + cell / 2
          
          playerSpriteRef.current = playerSprite
          
          // Create visualization graphics layer
          const visualizationGraphics = scene.add.graphics()
          visualizationGraphicsRef.current = visualizationGraphics
          
          // Mark the exit with a red "EXIT" sign
          if (level.cells) {
            const exitGraphics = scene.add.graphics()
            exitGraphics.lineStyle(6, 0xff0000) // Thick red line
            
            for (let r = 0; r < level.cells.length; r++) {
              for (let c = 0; c < level.cells[0].length; c++) {
                const cellWalls = level.cells[r][c].walls
                const x = c * cell
                const y = r * cell
                
                // Check if this cell has an opening to the outside
                if (r === 0 && !cellWalls.top) {
                  // Draw red line at top edge of cell
                  exitGraphics.moveTo(x, y)
                  exitGraphics.lineTo(x + cell, y)
                  exitGraphics.strokePath()
                } else if (r === level.cells.length - 1 && !cellWalls.bottom) {
                  // Draw red line at bottom edge of cell
                  exitGraphics.moveTo(x, y + cell)
                  exitGraphics.lineTo(x + cell, y + cell)
                  exitGraphics.strokePath()
                } else if (c === 0 && !cellWalls.left) {
                  // Draw red line at left edge of cell
                  exitGraphics.moveTo(x, y)
                  exitGraphics.lineTo(x, y + cell)
                  exitGraphics.strokePath()
                } else if (c === level.cells[0].length - 1 && !cellWalls.right) {
                  // Draw red line at right edge of cell
                  exitGraphics.moveTo(x + cell, y)
                  exitGraphics.lineTo(x + cell, y + cell)
                  exitGraphics.strokePath()
                }
              }
            }
          }
        }
      }
    }

    phaserGameRef.current = new Phaser.Game(config)

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
    }
  }, [level, cell])

  // Update player position
  useEffect(() => {
    if (playerSpriteRef.current) {
      playerSpriteRef.current.x = player.c * cell + cell / 2
      playerSpriteRef.current.y = player.r * cell + cell / 2
    }
  }, [player, cell])

  // Update visualization
  useEffect(() => {
    if (!visualizationGraphicsRef.current) return
    
    // Use requestAnimationFrame to batch updates for better performance
    const updateVisualization = () => {
      const graphics = visualizationGraphicsRef.current!
      const scene = graphics.scene
      graphics.clear()
      
      // Clear existing text objects
      scene.children.list.forEach(child => {
        if (child.type === 'Text' && (child as any).isAStarScore) {
          child.destroy()
        }
      })
      
      // Draw explored cells (light blue)
      graphics.fillStyle(0x3498db, 0.3) // Light blue with transparency
      visualizedCells.forEach(pos => {
        const x = pos.c * cell + 2
        const y = pos.r * cell + 2
        graphics.fillRect(x, y, cell - 4, cell - 4)
      })
      
      // Draw optimal path (green)
      if (optimalPath) {
        graphics.fillStyle(0x27ae60, 0.6) // Green with transparency
        optimalPath.forEach(pos => {
          const x = pos.c * cell + 4
          const y = pos.r * cell + 4
          graphics.fillRect(x, y, cell - 8, cell - 8)
        })
      }
      
      // Draw A* scores if enabled and available
      if (showAStarScores && aStarScores) {
        const fontSize = Math.max(6, Math.min(cell / 8, 10))
        
        // Only show scores for explored cells to reduce rendering load
        const exploredPositions = new Set(visualizedCells.map(pos => `${pos.r},${pos.c}`))
        
        // Limit the number of score displays for performance (show only recent ones)
        const maxScoreDisplays = Math.min(50, visualizedCells.length)
        const recentCells = visualizedCells.slice(-maxScoreDisplays)
        const recentPositions = new Set(recentCells.map(pos => `${pos.r},${pos.c}`))
        
        for (let r = 0; r < aStarScores.fScores.length; r++) {
          for (let c = 0; c < aStarScores.fScores[0].length; c++) {
            const fScore = aStarScores.fScores[r][c]
            const gScore = aStarScores.gScores[r][c]
            const hScore = aStarScores.hScores[r][c]
            
            // Only show scores for recent cells to maintain performance
            if (fScore !== Infinity && recentPositions.has(`${r},${c}`)) {
              const x = c * cell + 2
              const y = r * cell + 2
              
              // Create more compact text objects for f, g, h scores
              const fText = scene.add.text(x + 1, y + 1, `f${fScore}`, {
                fontSize: `${fontSize}px`,
                color: '#000000',
                backgroundColor: '#ffffff90',
                padding: { x: 0, y: 0 }
              })
              ;(fText as any).isAStarScore = true
              
              const gText = scene.add.text(x + 1, y + fontSize + 2, `g${gScore}`, {
                fontSize: `${fontSize}px`,
                color: '#0066cc',
                backgroundColor: '#ffffff90',
                padding: { x: 0, y: 0 }
              })
              ;(gText as any).isAStarScore = true
              
              const hText = scene.add.text(x + 1, y + (fontSize * 2) + 3, `h${hScore}`, {
                fontSize: `${fontSize}px`,
                color: '#cc6600',
                backgroundColor: '#ffffff90',
                padding: { x: 0, y: 0 }
              })
              ;(hText as any).isAStarScore = true
            }
          }
        }
      }
    }
    
    const animationId = requestAnimationFrame(updateVisualization)
    return () => cancelAnimationFrame(animationId)
  }, [visualizedCells, optimalPath, cell, showAStarScores, aStarScores])

  return <div ref={gameRef} style={{ border: '1px solid #ccc', display: 'inline-block' }} />
} 