// components/KanbanBoardTasks.jsx
import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import api from '../services/api';

// Tarjeta de tarea con drag & drop
function SortableTaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: 'grab',
  };

  const getPriorityColor = (priority) => {
    const map = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return map[priority] || '#6b7280';
  };

  const getPriorityLabel = (priority) => {
    const map = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return map[priority] || priority;
  };

  const getStatusIcon = (status) => {
    const map = {
      pending: <Clock size={14} style={{ color: '#f59e0b' }} />,
      in_progress: <AlertCircle size={14} style={{ color: '#3b82f6' }} />,
      completed: <CheckCircle size={14} style={{ color: '#10b981' }} />
    };
    return map[status] || <Clock size={14} />;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-task-card"
      onClick={() => !isDragging && onClick(task)}
    >
      <div className="kanban-task-title">{task.title}</div>
      {task.description && (
        <div className="kanban-task-description">{task.description}</div>
      )}
      <div className="kanban-task-meta">
        <span 
          className="kanban-task-priority"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        >
          {getPriorityLabel(task.priority)}
        </span>
        <span className="kanban-task-status-icon">
          {getStatusIcon(task.status)}
        </span>
      </div>
    </div>
  );
}

// Columna del Kanban
function DroppableColumn({ column, children, count }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
    disabled: true, // No permitir mover columnas
  });

  return (
    <div
      ref={setNodeRef}
      className="kanban-column"
    >
      <div className="kanban-column-header">
        <span className="kanban-column-title">{column.title}</span>
        <span className="column-count">{count}</span>
      </div>
      <div className="kanban-column-body">
        {children}
      </div>
    </div>
  );
}

// Columnas fijas (3 estados)
const FIXED_COLUMNS = [
  { id: 'pending', title: ' Pendiente' },
  { id: 'in_progress', title: ' En Progreso' },
  { id: 'completed', title: ' Finalizado' },
];

export default function KanbanBoardTasks({ tasks, onTaskUpdate, readOnly = false }) {
  const [items, setItems] = useState({});
  const [updating, setUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Inicializar items cuando cambian las tareas
  useEffect(() => {
    const initialItems = {};
    FIXED_COLUMNS.forEach(col => {
      initialItems[col.id] = tasks
        .filter(t => (t.status || '').toLowerCase() === col.id)
        .map(t => t.id);
    });
    setItems(initialItems);
  }, [tasks]);

  const getColumnItems = (columnId) => {
    return items[columnId] || [];
  };

  const findColumnForTask = (taskId) => {
    for (const [colId, taskIds] of Object.entries(items)) {
      if (taskIds.includes(taskId)) {
        return colId;
      }
    }
    return null;
  };

  const handleDragEnd = async (event) => {
    if (readOnly || updating) return;

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Encontrar la columna de origen
    const activeColumnId = findColumnForTask(activeId);
    let overColumnId = null;

    if (overId && items[overId] !== undefined) {
      overColumnId = overId;
    } else {
      overColumnId = findColumnForTask(overId);
    }

    if (!activeColumnId || !overColumnId) return;

    // Si es la misma columna, solo reordenar
    if (activeColumnId === overColumnId) {
      const columnItems = items[activeColumnId];
      const oldIndex = columnItems.indexOf(activeId);
      const newIndex = columnItems.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setItems({ ...items, [activeColumnId]: arrayMove(columnItems, oldIndex, newIndex) });
      }
      return;
    }

    // Movimiento entre columnas - actualizar estado en el backend
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    setUpdating(true);
    try {
      // Actualizar estado en el backend
      await api.put(`/tasks/${activeId}/status`, { status: overColumnId });

      // Actualizar estado local
      const activeItems = items[activeColumnId].filter(id => id !== activeId);
      const overItems = [...items[overColumnId], activeId];

      setItems({
        ...items,
        [activeColumnId]: activeItems,
        [overColumnId]: overItems,
      });

      // Notificar cambio
      if (onTaskUpdate) onTaskUpdate();

    } catch (error) {
      console.error('Error al mover tarea:', error);
      alert('Error al mover la tarea: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUpdating(false);
    }
  };

  // Obtener todas las columnas
  const allColumns = FIXED_COLUMNS;

  return (
    <div className="kanban-wrapper">
      {updating && (
        <div className="kanban-updating-overlay">
          <div className="loading-spinner-small"></div>
          <span>Actualizando...</span>
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {allColumns.map((column) => {
            const count = getColumnItems(column.id).length;
            const columnItems = getColumnItems(column.id);

            return (
              <DroppableColumn 
                key={column.id} 
                column={column} 
                count={count}
              >
                <SortableContext 
                  items={columnItems} 
                  strategy={verticalListSortingStrategy}
                >
                  {columnItems.map((taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (!task) return null;
                    return (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onClick={() => {}} // Sin acción al hacer click
                      />
                    );
                  })}
                  {count === 0 && (
                    <div className="kanban-empty-column">
                      <span>No hay tareas</span>
                    </div>
                  )}
                </SortableContext>
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}