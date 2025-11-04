import React, { useEffect } from "react";
import { DevicePicker } from "./components/DevicePicker";
import DeviceControlBar from "./components/DeviceControlBar";
import { useWindowControls } from "../shared/hooks";

export default function DeviceApp(): React.JSX.Element {
    const { handleDragStart, handleClose } =
        useWindowControls({
            baseWidth: 480,
            baseHeight: 530,
            windowType: "device",
        });

    useEffect(() => {
        try {
            const disableTransparency = localStorage.getItem("disableTransparency") === "true";
            document.body.style.backgroundColor = disableTransparency ? "#000" : "transparent";
        } catch (err) {
            console.warn("Failed to apply transparency setting", err);
        }

        try {
            const unsubscribe = window.electronAPI.onTransparencySettingChanged?.((isDisabled: boolean) => {
                document.body.style.backgroundColor = isDisabled ? "#000" : "transparent";
            });
            return unsubscribe;
        } catch (err) {
            console.warn("Failed to setup transparency listener", err);
        }
    }, []);

    return (
        <div className="device-app">
            <DeviceControlBar title="Select Network Device" onDragStart={handleDragStart} onClose={handleClose} />
            <DevicePicker />
        </div>
    );
}
