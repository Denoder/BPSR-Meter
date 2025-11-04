import React from "react";
import ReactDOM from "react-dom/client";
import MainApp from "./main/App";
import GroupApp from "./group/App";
import MonstersApp from "./monsters/App";
import HistoryApp from "./history/App";
import DeviceApp from "./device/App";
import SettingsApp from "./settings/App";
import "/css/style.css";

console.log("React entry point loaded");

// Determine which app to render based on current page
const renderApp = () => {
    const path = window.location.pathname;

    if (path.includes("group.html")) {
        return <GroupApp />;
    } else if (path.includes("monsters.html")) {
        return <MonstersApp />;
    } else if (path.includes("history.html")) {
        return <HistoryApp />;
    } else if (path.includes("device.html")) {
        return <DeviceApp />;
    } else if (path.includes("settings.html")) {
        return <SettingsApp />;
    } else {
        return <MainApp />;
    }
};

const root = document.getElementById("root");
if (root) {
    ReactDOM.createRoot(root).render(
        <React.StrictMode>{renderApp()}</React.StrictMode>,
    );
} else {
    console.error("Root element not found!");
}
