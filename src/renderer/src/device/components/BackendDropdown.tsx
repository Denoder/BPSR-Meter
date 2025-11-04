import React, { useEffect, useRef, useState } from "react";

interface Option {
    value: string;
    label: string;
    desc?: string;
}

const OPTIONS: Option[] = [
    { value: "npcap", label: "Npcap", desc: "Npcap (pcap)" },
    { value: "windivert", label: "WinDivert", desc: "WinDivert" },
];

export function BackendDropdown({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}): React.JSX.Element {
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

    const toggle = () => {
        if (disabled) return;
        setOpen((s) => !s);
    };

    const handleSelect = (val: string) => {
        onChange(val);
        setOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
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
        <div className="backend-dropdown" ref={ref}>
            <button
                type="button"
                className={`backend-trigger ${disabled ? "disabled" : ""}`}
                onClick={toggle}
                onKeyDown={onKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Select capture backend"
                disabled={disabled}
            >
                <div className="trigger-left">
                    <div className="trigger-label">{selected.label}</div>
                    <div className="trigger-desc">{selected.desc}</div>
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
                            <div className="opt-desc">{opt.desc}</div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default BackendDropdown;
