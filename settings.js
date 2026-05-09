document.getElementById("saveSettings").addEventListener("click", () => {
    const regions = document.getElementById("regions").value.split(",").map(item => item.trim());
    const menus = document.getElementById("menus").value.split(",").map(item => item.trim());
    const courses = document.getElementById("courses").value.split(",").map(item => item.trim());

    localStorage.setItem("regions", JSON.stringify(regions));
    localStorage.setItem("menus", JSON.stringify(menus));
    localStorage.setItem("courses", JSON.stringify(courses));

    alert("설정이 저장되었습니다!");
});