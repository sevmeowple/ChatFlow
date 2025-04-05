interface SidebarStyle {
    RootStyle: {
        variant: "sidebar" | "floating" | "inset";
        collapsible: "offcanvas" | "none" | "icon";
    }
}

const sidebarStyle: SidebarStyle = {
    RootStyle: {
        variant: "floating",
        collapsible: "icon",
    },
}

export { sidebarStyle }