import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect } from "react";

const TaskCard = ({ task, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");

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
    opacity: isDragging ? 0 : 1,
  };

  const handleSave = (e) => {
    e.stopPropagation();
    onEdit?.({ ...task, title, description });
    setIsEditing(false);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setTitle(task.title);
    setDescription(task.description || "");
    setIsEditing(false);
  };

  useEffect(() => {
  if (!isEditing) {
    setTitle(task.title);
    setDescription(task.description || "");
  }
}, [task.id, task.title, task.description, isEditing]);


  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white rounded-lg p-4 shadow-md"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-800 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Task title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-600 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="Description"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
    >
      <h3 className="font-medium text-gray-800 mb-1">{task.title}</h3>
      {task.description && (
        <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400"></span>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(task?.id);
            }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
