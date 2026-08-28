import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, GripVertical, ChevronLeft, ChevronRight, Trash2, Layers, AlertCircle } from 'lucide-react';
import api from '../services/api';

const COLUMN_COLORS = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#22c55e',
};

const CUSTOM_COLORS = [
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#d946ef',
  '#fb923c', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fbbf24'
];

let colorIndex = 0;
const getNextCustomColor = () => {
  const color = CUSTOM_COLORS[colorIndex % CUSTOM_COLORS.length];
  colorIndex++;
  return color;
};

function SortableProjectCard({ 
  project, 
  onClick, 
  columnId, 
  columnColor, 
  onRemove, 
  isCustom,
  onMoveLeft,
  onMoveRight,
  hasLeft,
  hasRight,
  onSplash,
}) {
  const color = columnColor || getColumnColor(columnId);
  const [isHovered, setIsHovered] = useState(false);
  const [isJelly, setIsJelly] = useState(false);
  const cardRef = useRef(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsJelly(true);
    setTimeout(() => setIsJelly(false), 600);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMove = (direction) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      onSplash(centerX, centerY, color);
    }
    if (direction === 'left') {
      onMoveLeft(project.id);
    } else {
      onMoveRight(project.id);
    }
  };

  const getJellyTransform = () => {
    if (isJelly) {
      return 'scale(1.06) rotate(1.5deg) translateY(-4px)';
    }
    if (isHovered) {
      return 'scale(1.03) translateY(-3px)';
    }
    return 'scale(1)';
  };

  const style = {
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '10px',
    border: `2px solid ${isHovered ? color : `${color}66`}`,
    background: isHovered ? `${color}20` : 'rgba(255, 255, 255, 0.08)',
    boxShadow: isHovered ? `0 8px 30px ${color}44` : '0 4px 12px rgba(0,0,0,0.2)',
    color: '#ffffff',
    backdropFilter: 'blur(8px)',
    position: 'relative',
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: getJellyTransform(),
    cursor: 'pointer',
  };

  return (
    <div ref={cardRef} style={style} onClick={() => onClick(project)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px', color: '#ffffff', wordBreak: 'break-word' }}>
            {project.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '6px' }}>
            Cliente: {project.client_name || 'Sin cliente'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
            ${project.budget?.toLocaleString('es-MX')}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); if (hasLeft) handleMove('left'); }} disabled={!hasLeft}
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${hasLeft ? color : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: hasLeft ? color : '#64748b', cursor: hasLeft ? 'pointer' : 'not-allowed', padding: '3px 8px', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', opacity: hasLeft ? (isHovered ? 1 : 0.6) : 0.2, display: 'flex', alignItems: 'center', transform: isHovered && hasLeft ? 'scale(1.15)' : 'scale(1)' }}
            title="Mover a columna anterior">
            <ChevronLeft size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (hasRight) handleMove('right'); }} disabled={!hasRight}
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${hasRight ? color : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', color: hasRight ? color : '#64748b', cursor: hasRight ? 'pointer' : 'not-allowed', padding: '3px 8px', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', opacity: hasRight ? (isHovered ? 1 : 0.6) : 0.2, display: 'flex', alignItems: 'center', transform: isHovered && hasRight ? 'scale(1.15)' : 'scale(1)' }}
            title="Mover a columna siguiente">
            <ChevronRight size={14} />
          </button>
        </div>

        {isCustom && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(project.id); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', opacity: isHovered ? 1 : 0.3, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Quitar del tablero">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ column, children, count, onDelete, columnColor, onAddProject, allProjects, currentProjects, maxItems, totalProjects, columnIndex, totalColumns, boardProjectIds, allBoardProjectIds, onSplash }) {
  const isCustom = column.id !== 'pending' && column.id !== 'in_progress' && column.id !== 'completed';
  const isPending = column.id === 'pending';
  const color = columnColor || getColumnColor(column.id);
  const [isHovered, setIsHovered] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [isJelly, setIsJelly] = useState(false);
  
  const isFull = totalProjects >= maxItems;
  const availableProjects = allProjects.filter(p => {
    if (allBoardProjectIds.includes(p.id)) return false;
    if (currentProjects.includes(p.id)) return false;
    return true;
  });

  const handleColumnEnter = () => {
    setIsHovered(true);
    setIsJelly(true);
    setTimeout(() => setIsJelly(false), 500);
  };

  const columnStyle = {
    background: isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    padding: '14px',
    minWidth: '300px',
    flex: '0 0 300px',
    border: `2px solid ${isHovered ? `${color}88` : `${color}44`}`,
    maxHeight: '450px', // Altura fija para que el scroll interno funcione
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: isJelly ? 'scale(1.015) rotate(0.8deg)' : (isHovered ? 'scale(1.01)' : 'scale(1)'),
    position: 'relative',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  };

  const handleDeleteClick = () => {
    if (count > 0) {
      setLocalError(`No puedes eliminar "${column.title}" porque tiene ${count} proyecto(s). Mueve o elimina los proyectos primero.`);
      setTimeout(() => setLocalError(null), 5000);
      return;
    }
    onDelete(column.id);
  };

  return (
    <div style={columnStyle} onMouseEnter={handleColumnEnter} onMouseLeave={() => setIsHovered(false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: `2px solid ${color}55`, marginBottom: '10px', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: color, boxShadow: `0 0 12px ${color}88` }} />
          {column.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ background: `${color}44`, padding: '2px 10px', borderRadius: '9999px', fontSize: '13px', color: '#ffffff', fontWeight: 700 }}>{count}</span>
          {isCustom && (
            <button onClick={handleDeleteClick} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
              title={count > 0 ? 'No puedes eliminar una columna con proyectos' : 'Eliminar columna'}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      
      {localError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginBottom: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', color: '#f87171', fontSize: '12px', animation: 'fadeIn 0.5s ease' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{localError}</span>
        </div>
      )}
      
      {/* Este div tiene scroll interno y barra oculta */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: '80px',
        padding: '4px 0',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {children}
        {count === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px', opacity: 0.6, userSelect: 'none', fontStyle: 'italic' }}>
            {isPending ? 'Agrega proyectos desde el botón +' : 'Sin proyectos'}
          </div>
        )}
      </div>

      {isPending && !isFull && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${color}33` }}>
          <button onClick={() => setShowProjectSelector(!showProjectSelector)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px dashed ${color}88`, background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = `${color}20`; e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${color}88`; e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <Plus size={14} /> Agregar proyecto ({totalProjects}/{maxItems})
          </button>
          {showProjectSelector && (
            <div style={{ marginTop: '6px', maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.7)', borderRadius: '8px', padding: '4px', animation: 'fadeIn 0.4s ease', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {availableProjects.length > 0 ? (
                availableProjects.map(p => (
                  <button key={p.id} onClick={() => { onAddProject(column.id, p.id); setShowProjectSelector(false); }}
                    style={{ display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left', background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '13px', borderRadius: '6px', transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}33`; e.currentTarget.style.transform = 'scale(1.03) translateX(4px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1) translateX(0)'; }}>
                    {p.name}
                  </button>
                ))
              ) : (
                <div style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '11px', opacity: 0.5 }}>No hay proyectos disponibles</div>
              )}
            </div>
          )}
        </div>
      )}
      
      {isPending && isFull && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${color}33`, textAlign: 'center', color: '#ef4444', fontSize: '12px', opacity: 0.8, animation: 'fadeIn 0.4s ease' }}>
          ⚠️ Límite alcanzado ({maxItems} proyectos en total)
        </div>
      )}
    </div>
  );
}

const FIXED_COLUMNS = [
  { id: 'pending', title: 'Pendiente' },
  { id: 'in_progress', title: 'En Desarrollo' },
  { id: 'completed', title: 'Finalizado' },
];

export default function KanbanBoard({ projects, onProjectClick, onProjectUpdate }) {
  const [boards, setBoards] = useState(() => {
    const saved = localStorage.getItem('kanban_boards_v2');
    if (saved) { try { return JSON.parse(saved); } catch { return [{ id: 'default', name: 'Principal' }]; } }
    return [{ id: 'default', name: 'Principal' }];
  });

  const [currentBoardId, setCurrentBoardId] = useState('default');
  const [customColumnsByBoard, setCustomColumnsByBoard] = useState(() => {
    const saved = localStorage.getItem('kanban_custom_columns_v2');
    if (saved) { try { return JSON.parse(saved); } catch { return { default: [] }; } }
    return { default: [] };
  });

  const [customColumnColors, setCustomColumnColors] = useState(() => {
    const saved = localStorage.getItem('kanban_column_colors_v2');
    if (saved) { try { return JSON.parse(saved); } catch { return {}; } }
    return {};
  });

  const [boardProjectIds, setBoardProjectIds] = useState(() => {
    const saved = localStorage.getItem('kanban_board_projects_v2');
    if (saved) { try { return JSON.parse(saved); } catch { return { default: [] }; } }
    return { default: [] };
  });

  const [items, setItems] = useState({});
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [globalError, setGlobalError] = useState(null);
  const [splashParticles, setSplashParticles] = useState([]);

  const MAX_ITEMS = 4;

  const handleSplash = (x, y, color) => {
    const particles = [];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 55;
      const size = 3 + Math.random() * 8;
      const delay = Math.random() * 200;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      particles.push({ id: Date.now() + i + Math.random(), x: x + tx, y: y + ty, size, color, delay, opacity: 0.7 + Math.random() * 0.3, tx, ty, life: 1 });
    }
    setSplashParticles(prev => [...prev, ...particles]);
    setTimeout(() => { setSplashParticles(prev => prev.filter(p => !particles.some(np => np.id === p.id))); }, 800);
  };

  const getCurrentColumns = () => {
    const customCols = customColumnsByBoard[currentBoardId] || [];
    return [...FIXED_COLUMNS.slice(0, 1), ...customCols, ...FIXED_COLUMNS.slice(1)];
  };

  const columns = getCurrentColumns();

  const getColumnColor = (columnId) => {
    if (COLUMN_COLORS[columnId]) return COLUMN_COLORS[columnId];
    const boardColors = customColumnColors[currentBoardId] || {};
    return boardColors[columnId] || '#8b5cf6';
  };

  const getAllBoardProjectIds = () => {
    const allIds = [];
    Object.values(boardProjectIds).forEach(ids => { allIds.push(...ids); });
    return [...new Set(allIds)];
  };

  useEffect(() => { localStorage.setItem('kanban_boards_v2', JSON.stringify(boards)); }, [boards]);
  useEffect(() => { localStorage.setItem('kanban_custom_columns_v2', JSON.stringify(customColumnsByBoard)); }, [customColumnsByBoard]);
  useEffect(() => { localStorage.setItem('kanban_column_colors_v2', JSON.stringify(customColumnColors)); }, [customColumnColors]);
  useEffect(() => { localStorage.setItem('kanban_board_projects_v2', JSON.stringify(boardProjectIds)); }, [boardProjectIds]);

  useEffect(() => {
    const initialItems = {};
    const allCols = getCurrentColumns();
    const boardProjects = boardProjectIds[currentBoardId] || [];
    allCols.forEach(col => {
      const colProjects = boardProjects.filter(id => {
        const p = projects.find(proj => proj.id === id);
        return p && (p.status || '').toLowerCase() === col.id;
      });
      initialItems[col.id] = colProjects;
    });
    setItems(initialItems);
  }, [projects, customColumnsByBoard, currentBoardId, boardProjectIds]);

  const getColumnItems = (columnId) => items[columnId] || [];
  const getTotalProjects = () => {
    let total = 0;
    getCurrentColumns().forEach(col => { total += (items[col.id] || []).length; });
    return total;
  };

  const findColumnForProject = (projectId) => {
    for (const [colId, projectIds] of Object.entries(items)) {
      if (projectIds.includes(projectId)) return colId;
    }
    return null;
  };

  const isBoardFull = () => getTotalProjects() >= MAX_ITEMS;

  const goToPreviousBoard = () => {
    const currentIndex = boards.findIndex(b => b.id === currentBoardId);
    if (currentIndex > 0) setCurrentBoardId(boards[currentIndex - 1].id);
  };

  const goToNextBoard = () => {
    const currentIndex = boards.findIndex(b => b.id === currentBoardId);
    if (currentIndex < boards.length - 1) setCurrentBoardId(boards[currentIndex + 1].id);
  };

  const moveProject = async (projectId, direction) => {
    const currentColumnId = findColumnForProject(projectId);
    if (!currentColumnId) return;
    const allCols = getCurrentColumns();
    const currentIndex = allCols.findIndex(c => c.id === currentColumnId);
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= allCols.length) return;
    const targetColumnId = allCols[targetIndex].id;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      await api.put(`/projects/${projectId}`, { status: targetColumnId });
      const currentItems = items[currentColumnId].filter(id => id !== projectId);
      const targetItems = [...(items[targetColumnId] || []), projectId];
      setItems({ ...items, [currentColumnId]: currentItems, [targetColumnId]: targetItems });
      if (onProjectUpdate) onProjectUpdate();
    } catch (error) {
      console.error('Error al mover proyecto:', error);
      alert('Error al mover el proyecto');
    }
  };

  const handleAddColumn = () => {
    const title = newColumnTitle.trim() || `Columna ${(customColumnsByBoard[currentBoardId] || []).length + 1}`;
    const newId = title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
    const newColor = getNextCustomColor();
    const currentCols = customColumnsByBoard[currentBoardId] || [];
    setCustomColumnsByBoard(prev => ({ ...prev, [currentBoardId]: [...currentCols, { id: newId, title }] }));
    setCustomColumnColors(prev => ({ ...prev, [currentBoardId]: { ...(prev[currentBoardId] || {}), [newId]: newColor } }));
    setItems({ ...items, [newId]: [] });
    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  const handleDeleteColumn = (columnId) => {
    if (FIXED_COLUMNS.some(c => c.id === columnId)) {
      setGlobalError('No puedes eliminar columnas principales');
      setTimeout(() => setGlobalError(null), 4000);
      return;
    }
    const columnItems = items[columnId] || [];
    if (columnItems.length > 0) return;
    const currentCols = customColumnsByBoard[currentBoardId] || [];
    setCustomColumnsByBoard(prev => ({ ...prev, [currentBoardId]: currentCols.filter(c => c.id !== columnId) }));
    const newColors = { ...customColumnColors };
    if (newColors[currentBoardId]) delete newColors[currentBoardId][columnId];
    setCustomColumnColors(newColors);
    const newItems = { ...items };
    delete newItems[columnId];
    setItems(newItems);
  };

  const handleAddProjectToColumn = (columnId, projectId) => {
    if (isBoardFull()) { alert(`Límite alcanzado: solo puedes tener ${MAX_ITEMS} proyectos en total en este tablero`); return; }
    const allBoardProjects = getAllBoardProjectIds();
    if (allBoardProjects.includes(projectId)) { alert('Este proyecto ya está asignado a otro tablero'); return; }
    const currentItems = items[columnId] || [];
    if (currentItems.includes(projectId)) return;
    const currentBoardProjects = boardProjectIds[currentBoardId] || [];
    if (!currentBoardProjects.includes(projectId)) {
      setBoardProjectIds(prev => ({ ...prev, [currentBoardId]: [...(prev[currentBoardId] || []), projectId] }));
    }
    setItems({ ...items, [columnId]: [...currentItems, projectId] });
  };

  const handleRemoveProjectFromColumn = (projectId) => {
    const columnId = findColumnForProject(projectId);
    if (!columnId) return;
    if (COLUMN_COLORS[columnId]) { alert('No puedes quitar proyectos de columnas principales'); return; }
    const currentItems = items[columnId].filter(id => id !== projectId);
    setItems({ ...items, [columnId]: currentItems });
    const currentBoardProjects = boardProjectIds[currentBoardId] || [];
    setBoardProjectIds(prev => ({ ...prev, [currentBoardId]: currentBoardProjects.filter(id => id !== projectId) }));
  };

  const handleAddBoard = () => {
    if (showAddBoard) {
      const name = newBoardName.trim() || `Tablero ${boards.length}`;
      const newBoard = { id: 'board_' + Date.now(), name };
      setBoards([...boards, newBoard]);
      setCustomColumnsByBoard(prev => ({ ...prev, [newBoard.id]: [] }));
      setBoardProjectIds(prev => ({ ...prev, [newBoard.id]: [] }));
      colorIndex = 0;
      setCurrentBoardId(newBoard.id);
      setNewBoardName('');
      setShowAddBoard(false);
    } else {
      setShowAddBoard(true);
    }
  };

  const handleDeleteBoard = (boardId) => {
    if (boardId === 'default') { setGlobalError('No puedes eliminar el tablero principal'); setTimeout(() => setGlobalError(null), 4000); return; }
    setBoards(boards.filter(b => b.id !== boardId));
    const newCustom = { ...customColumnsByBoard };
    delete newCustom[boardId];
    setCustomColumnsByBoard(newCustom);
    const newProjects = { ...boardProjectIds };
    delete newProjects[boardId];
    setBoardProjectIds(newProjects);
    if (currentBoardId === boardId) setCurrentBoardId('default');
  };

  const handleSelectBoard = (boardId) => { setCurrentBoardId(boardId); setShowAddBoard(false); };

  const allColumns = getCurrentColumns();
  const currentBoard = boards.find(b => b.id === currentBoardId);
  const boardIndex = boards.findIndex(b => b.id === currentBoardId);
  const isDefaultBoard = currentBoardId === 'default';
  const totalProjects = getTotalProjects();
  const boardProjects = boardProjectIds[currentBoardId] || [];
  const allBoardProjectIds = getAllBoardProjectIds();

  return (
    <div className="kanban-wrapper" style={{ padding: '12px', position: 'relative', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 'calc(100vh - 150px)', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <style>{`
        .kanban-wrapper::-webkit-scrollbar { display: none; }
        .kanban-wrapper { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes splashOut { 0% { transform: scale(1) translate(0, 0); opacity: 0.9; } 100% { transform: scale(0.1) translate(var(--tx), var(--ty)); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {splashParticles.map(p => (
        <div key={p.id} style={{ position: 'fixed', left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size, height: p.size, borderRadius: '50%', background: p.color, pointerEvents: 'none', zIndex: 9999, opacity: p.opacity, animation: `splashOut 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`, animationDelay: `${p.delay}ms` }} />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: '#60a5fa' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{currentBoard?.name || 'Principal'}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>({boardIndex + 1}/{boards.length})</span>
          <span style={{ fontSize: '12px', color: totalProjects >= MAX_ITEMS ? '#ef4444' : '#94a3b8', fontWeight: 600, background: totalProjects >= MAX_ITEMS ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '12px' }}>{totalProjects}/{MAX_ITEMS}</span>
          {!isDefaultBoard && (
            <button onClick={() => handleDeleteBoard(currentBoardId)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', transition: 'all 0.3s', display: 'flex', alignItems: 'center' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
              title="Eliminar tablero">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={goToPreviousBoard} disabled={boardIndex === 0} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: boardIndex === 0 ? '#64748b' : '#ffffff', cursor: boardIndex === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: boardIndex === 0 ? 0.3 : 1 }}
            onMouseEnter={(e) => { if (boardIndex !== 0) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.06)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <ChevronLeft size={16} /> Anterior
          </button>
          
          <button onClick={goToNextBoard} disabled={boardIndex === boards.length - 1} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: boardIndex === boards.length - 1 ? '#64748b' : '#ffffff', cursor: boardIndex === boards.length - 1 ? 'not-allowed' : 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: boardIndex === boards.length - 1 ? 0.3 : 1 }}
            onMouseEnter={(e) => { if (boardIndex !== boards.length - 1) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.06)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            Siguiente <ChevronRight size={16} />
          </button>

          <button onClick={handleAddBoard} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '4px' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </div>

      {globalError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', marginBottom: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '13px', animation: 'fadeIn 0.5s ease' }}>
          <AlertCircle size={18} /> <span>{globalError}</span>
        </div>
      )}

      {showAddBoard && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.5s ease' }}>
          <input type="text" placeholder="Nombre del tablero (opcional)" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddBoard()} autoFocus
            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '200px', outline: 'none', fontSize: '13px', transition: 'all 0.3s' }}
            onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }} />
          <button onClick={handleAddBoard} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '13px', transition: 'all 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>Crear</button>
          <button onClick={() => setShowAddBoard(false)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', transition: 'all 0.3s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.transform = 'scale(1)'; }}>Cancelar</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {showAddColumn ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeIn 0.5s ease' }}>
            <input type="text" placeholder="Nombre de la columna" value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} autoFocus
              style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', width: '200px', outline: 'none', fontSize: '13px', transition: 'all 0.3s' }}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }} />
            <button onClick={handleAddColumn} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500', fontSize: '13px', transition: 'all 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>Agregar</button>
            <button onClick={() => setShowAddColumn(false)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', transition: 'all 0.3s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.transform = 'scale(1)'; }}>Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setShowAddColumn(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.3s', fontSize: '13px', fontWeight: '500' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}>
            <Plus size={16} /> Nueva columna
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '4px 4px 12px 4px', minHeight: '300px', scrollBehavior: 'smooth' }}>
        {allColumns.map((column, index) => {
          const isCustom = !FIXED_COLUMNS.some(c => c.id === column.id);
          const count = getColumnItems(column.id).length;
          const columnItems = getColumnItems(column.id);
          const color = getColumnColor(column.id);

          return (
            <DroppableColumn key={column.id} column={column} count={count} onDelete={handleDeleteColumn} columnColor={color}
              onAddProject={handleAddProjectToColumn} allProjects={projects} currentProjects={columnItems} maxItems={MAX_ITEMS}
              totalProjects={totalProjects} columnIndex={index} totalColumns={allColumns.length} boardProjectIds={boardProjects}
              allBoardProjectIds={allBoardProjectIds} onSplash={handleSplash}>
              {columnItems.map((projectId) => {
                const project = projects.find(p => p.id === projectId);
                if (!project) return null;
                const hasLeft = index > 0;
                const hasRight = index < allColumns.length - 1;
                return (
                  <SortableProjectCard key={project.id} project={project} onClick={onProjectClick} columnId={column.id} columnColor={color}
                    onRemove={handleRemoveProjectFromColumn} isCustom={isCustom} onMoveLeft={() => moveProject(project.id, 'left')}
                    onMoveRight={() => moveProject(project.id, 'right')} hasLeft={hasLeft} hasRight={hasRight} onSplash={handleSplash} />
                );
              })}
            </DroppableColumn>
          );
        })}
      </div>
    </div>
  );
}