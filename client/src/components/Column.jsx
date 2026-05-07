import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";

const Column = ({ columnName, tasks, onCreateTask, onEditTask, onDeleteTask }) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnName.id });
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    await onCreateTask({ title, description, columnName: columnName.id });
    setTitle("");
    setDescription("");
    setIsAdding(false);
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setIsAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl p-4 w-80 min-h-125 flex flex-col transition ${
        isOver ? "bg-blue-100" : "bg-gray-200"
      }`}
    >

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700 text-lg">{columnName.title}</h2>
        <span className="bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
      </div>

      {isAdding ? (
        <div className="mt-4 bg-white rounded-lg p-3 flex flex-col gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-4 w-full bg-white hover:bg-gray-50 text-gray-500 border border-dashed border-gray-400 rounded-lg py-2 text-sm transition"
        >
          + Add Task
        </button>
      )}
    </div>
  );
};

export default Column;
