import React, { useState, useEffect } from 'react';
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
import { X, Plus } from 'lucide-react';
import api from '../services/api';

function SortableProjectCard({ project, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card"
      onClick={() => !isDragging && onClick(project)}
    >
      <div className="kanban-card-title">{project.name}</div>
      <div className="kanban-card-client">
        Cliente: {project.client_name || 'Sin cliente'}
      </div>
      <div className="kanban-card-budget">${project.budget?.toLocaleString('es-MX')}</div>
    </div>
  );
}

// Componente para que las columnas sean "droppable"
function DroppableColumn({ column, children, count, onDelete }) {
  const isCustom = column.id !== 'pending' && column.id !== 'in_progress' && column.id !== 'completed';
  
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
    disabled: !isCustom,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '12px',
        minWidth: '280px',
        flex: '0 0 280px',
        border: '1px solid rgba(255,255,255,0.08)',
        maxHeight: '550px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#e2e8f0' }}>{column.title}</span>
        <span style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          color: '#94a3b8'
        }}>{count}</span>
        {isCustom && (
          <button
            onClick={() => onDelete(column.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: '80px',
        padding: '4px 0'
      }}>
        {children}
      </div>
    </div>
  );
}

const FIXED_COLUMNS = [
  { id: 'pending', title: 'Pendiente' },
  { id: 'in_progress', title: 'En Desarrollo' },
  { id: 'completed', title: 'Finalizado' },
];

export default function KanbanBoard({ projects, onProjectClick, onProjectUpdate }) {
  const [customColumns, setCustomColumns] = useState([]);
  const [items, setItems] = useState({});
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getAllColumns = () => {
    return [
      ...FIXED_COLUMNS.slice(0, 1),
      ...customColumns,
      ...FIXED_COLUMNS.slice(1),
    ];
  };

  const columns = getAllColumns();

  useEffect(() => {
    const initialItems = {};
    columns.forEach(col => {
      initialItems[col.id] = projects
        .filter(p => (p.status || '').toLowerCase() === col.id)
        .map(p => p.id);
    });
    setItems(initialItems);
  }, [projects, customColumns]);

  const getColumnItems = (columnId) => {
    return items[columnId] || [];
  };

  const findColumnForProject = (projectId) => {
    for (const [colId, projectIds] of Object.entries(items)) {
      if (projectIds.includes(projectId)) {
        return colId;
      }
    }
    return null;
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isColumnDrag = customColumns.some(c => c.id === activeId);
    if (isColumnDrag) {
      const oldIndex = customColumns.findIndex(c => c.id === activeId);
      const newIndex = customColumns.findIndex(c => c.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setCustomColumns(arrayMove(customColumns, oldIndex, newIndex));
      }
      return;
    }

    const activeColumnId = findColumnForProject(activeId);
    let overColumnId = null;

    if (overId && items[overId] !== undefined) {
      overColumnId = overId;
    } else {
      overColumnId = findColumnForProject(overId);
    }

    if (!activeColumnId || !overColumnId) return;
    if (activeColumnId === overColumnId) {
      const columnItems = items[activeColumnId];
      const oldIndex = columnItems.indexOf(activeId);
      const newIndex = columnItems.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setItems({ ...items, [activeColumnId]: arrayMove(columnItems, oldIndex, newIndex) });
      }
      return;
    }

    const project = projects.find(p => p.id === activeId);
    if (!project) return;

    try {
      await api.put(`/projects/${activeId}`, { status: overColumnId });

      const activeItems = items[activeColumnId].filter(id => id !== activeId);
      const overItems = [...items[overColumnId], activeId];

      setItems({
        ...items,
        [activeColumnId]: activeItems,
        [overColumnId]: overItems,
      });

      if (onProjectUpdate) onProjectUpdate();
    } catch (error) {
      console.error('Error al mover proyecto:', error);
      alert('Error al mover el proyecto: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAddColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) {
      alert('Escribe un nombre para la columna');
      return;
    }
    const newId = title.toLowerCase().replace(/\s+/g, '_');
    setCustomColumns([...customColumns, { id: newId, title: title }]);
    setItems({ ...items, [newId]: [] });
    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  const handleDeleteColumn = (columnId) => {
    if (FIXED_COLUMNS.some(c => c.id === columnId)) {
      alert('No puedes eliminar columnas principales');
      return;
    }
    setCustomColumns(customColumns.filter(c => c.id !== columnId));
    const newItems = { ...items };
    delete newItems[columnId];
    setItems(newItems);
  };

  const allColumns = [
    ...FIXED_COLUMNS.slice(0, 1),
    ...customColumns,
    ...FIXED_COLUMNS.slice(1),
  ];

  return (
    <div className="kanban-wrapper">
      {/* BOTÓN AGREGAR COLUMNA - TOTALMENTE FUERA DEL DNDCONTEXT */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 50,
        pointerEvents: 'auto',
      }}>
        {showAddColumn ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Nombre de la columna"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
              autoFocus
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'white',
                width: '220px',
                outline: 'none',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleAddColumn}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              Agregar
            </button>
            <button
              onClick={() => setShowAddColumn(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              console.log('Click en agregar columna');
              setShowAddColumn(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              fontWeight: '500',
              position: 'relative',
              zIndex: 60,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
              e.currentTarget.style.background = 'rgba(59,130,246,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
          >
            <Plus size={18} /> Agregar columna
          </button>
        )}
      </div>

      {/* KANBAN - DNDCONTEXT SOLO PARA EL TABLERO */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '4px' }}>
          {allColumns.map((column) => {
            const isCustom = !FIXED_COLUMNS.some(c => c.id === column.id);
            const count = getColumnItems(column.id).length;
            const columnItems = getColumnItems(column.id);

            return (
              <DroppableColumn 
                key={column.id} 
                column={column} 
                count={count}
                onDelete={handleDeleteColumn}
              >
                <SortableContext 
                  items={columnItems} 
                  strategy={verticalListSortingStrategy}
                >
                  {columnItems.map((projectId) => {
                    const project = projects.find(p => p.id === projectId);
                    if (!project) return null;
                    return (
                      <SortableProjectCard
                        key={project.id}
                        project={project}
                        onClick={onProjectClick}
                      />
                    );
                  })}
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}