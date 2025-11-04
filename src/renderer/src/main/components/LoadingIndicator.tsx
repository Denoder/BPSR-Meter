import React, { memo } from "react";

export interface LoadingIndicatorProps {
    message?: string;
}

function LoadingIndicatorComponent({
    message = "Waiting for data...",
}: LoadingIndicatorProps): React.JSX.Element {
    return (
        <div id="loading-indicator">
            <i
                className="fa-solid fa-spinner fa-spin"
                style={{ marginRight: "8px" }}
            ></i>
            {message}
        </div>
    );
}

export const LoadingIndicator = memo(LoadingIndicatorComponent);
