import React, { useState, useMemo } from 'react';
import type { Task } from '../../types';

interface TaskCalendarProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TaskCalendar: React.FC<TaskCalendarProps> = ({ tasks, onEditTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const { days, monthLabel } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startingDayIndex = firstDay.getDay(); // 0 = Sunday
        const totalDays = lastDay.getDate();

        const daysArray = [];

        // Previous month padding
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayIndex - 1; i >= 0; i--) {
            daysArray.push({
                day: prevMonthLastDay - i,
                currentMonth: false,
                date: new Date(year, month - 1, prevMonthLastDay - i)
            });
        }

        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            daysArray.push({
                day: i,
                currentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month padding
        const remainingSlots = 42 - daysArray.length; // 6 rows * 7 cols
        for (let i = 1; i <= remainingSlots; i++) {
            daysArray.push({
                day: i,
                currentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return {
            days: daysArray,
            monthLabel: firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })
        };
    }, [currentDate]);

    const getTasksForDate = (date: Date) => {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        return tasks.filter(task => {
            if (!task.due_date) return false;
            const taskDate = new Date(task.due_date);
            return taskDate >= startOfDay && taskDate <= endOfDay;
        });
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const today = () => {
        setCurrentDate(new Date());
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{monthLabel}</h2>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button onClick={today} className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                        Today
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                {DAYS.map(day => (
                    <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 auto-rows-fr">
                {days.map((dayObj, idx) => {
                    const dayTasks = getTasksForDate(dayObj.date);
                    const isToday = new Date().toDateString() === dayObj.date.toDateString();

                    return (
                        <div
                            key={idx}
                            className={`min-h-[100px] p-2 border-b border-r border-slate-100 dark:border-slate-700/50 ${!dayObj.currentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50 text-slate-400' : 'bg-white dark:bg-slate-800'
                                } ${idx % 7 === 6 ? 'border-r-0' : ''}`}
                        >
                            <div className={`text-xs font-medium mb-1 ${isToday ? 'inline-flex items-center justify-center w-6 h-6 bg-primary text-white rounded-full' : ''}`}>
                                {dayObj.day}
                            </div>
                            <div className="space-y-1">
                                {dayTasks.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => onEditTask(task)}
                                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${task.status === 'Completed'
                                                ? 'bg-green-100 text-green-800 line-through opacity-70'
                                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200'
                                            }`}
                                        title={task.title}
                                    >
                                        {task.title || task.type}
                                    </button>
                                ))}
                                {dayTasks.length > 3 && (
                                    <div className="text-[10px] text-slate-400 pl-1">
                                        + {dayTasks.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskCalendar;
