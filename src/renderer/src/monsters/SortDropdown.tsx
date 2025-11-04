import React, { useEffect, useRef, useState } from "react";

interface Option {
    value: string;
    label: string;
}

const OPTIONS: Option[] = [
    { value: "hp", label: "HP" },
    { value: "name", label: "Name" },
    { value: "id", label: "ID" },
];

export function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void; }): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState<number>(() => Math.max(0, OPTIONS.findIndex((o) => o.value === value)));
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setHighlight(Math.max(0, OPTIONS.findIndex((o) => o.value === value)));
    }, [value]);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const toggle = () => setOpen((s) => !s);

    const handleSelect = (val: string) => {
        onChange(val);
        setOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => (h + 1) % OPTIONS.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => (h - 1 + OPTIONS.length) % OPTIONS.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            handleSelect(OPTIONS[highlight].value);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const selected = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

    return (
        <div className="backend-dropdown" ref={ref} style={{ minWidth: 140 }}>
            <button
                type="button"
                className={`backend-trigger`}
                onClick={toggle}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Select sort"
            >
                <div className="trigger-left">
                    <div className="trigger-label">{selected.label}</div>
                </div>
                <div className="trigger-chevron" aria-hidden />
            </button>

            {open && (
                <ul className="backend-list" role="listbox" tabIndex={-1}>
                    {OPTIONS.map((opt, idx) => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            className={`backend-option ${opt.value === value ? "selected" : ""} ${idx === highlight ? "highlight" : ""}`}
                            onMouseEnter={() => setHighlight(idx)}
                            onClick={() => handleSelect(opt.value)}
                        >
                            <div className="opt-label">{opt.label}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default SortDropdown;
