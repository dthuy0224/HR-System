const { expect } = require("@jest/globals");
const db = require("../../db");
const cheerio = require("cheerio");
const User = require("../../models/user");
const bcrypt = require("bcryptjs");

describe("Admin Routes", () => {
  test("GET / should render admin home page", async () => {
    const res = await admin_agent.get("/admin/");

    expect(res.statusCode).toBe(200);

    const $ = cheerio.load(res.text);
    const anchor = $("a.navbar-brand");
    const icon = anchor.find("i.fa.fa-a.fa-4");
    const text = anchor.text().trim();

    expect(anchor).toHaveLength(1);
    expect(icon).toHaveLength(1);
    expect(text).toBe("Admin Admin");
  });

  test("GET /admin/view-all-employees should return all employees", async () => {
    const res = await admin_agent.get("/admin/view-all-employees");
    expect(res.statusCode).toBe(200);

    const $ = cheerio.load(res.text);
    const title = $("title").text();

    expect(title.trim()).toBe("HRMS|All Employees");

    const employees = $("#example > tbody > tr");
    expect(employees).toHaveLength(4);
  });

  test("GET /admin/employee-profile/:id should return employee profile", async () => {
    let employeeId;
    let employeeName;
    await db.connect().then(async () => {
      const employee = await User.findOne({ type: "accounts_manager" });
      employeeId = employee._id;
      employeeName = employee.name;
      db.close();
    });

    const res = await admin_agent.get(`/admin/employee-profile/${employeeId}`);
    expect(res.statusCode).toBe(200);

    const $ = cheerio.load(res.text);
    const title = $("title").text();
    const _employeeName = $("#name").text();

    expect(title.trim()).toBe("HRMS|Employee Profile");
    expect(_employeeName.trim()).toBe(employeeName);
  });

  beforeAll(async () => {
    await db.connect();
    await User.create({
      type: "admin",
      email: "admin@admin.com",
      password: bcrypt.hashSync("admin123", bcrypt.genSaltSync(5), null),
      name: "Admin Admin",
      firstName: "Admin",
      lastName: "Admin",
      dateOfBirth: new Date("1980-05-26"),
      contactNumber: "0912345678", // Đúng định dạng VN
      gender: "Male",
      department: "HR",
      jobTitle: "Administrator",
      jobId: "ADM001",
      idNumber: "123456789012",
      employmentType: "Full-time",
      startDate: new Date("2020-01-01"),
      address: {
        city: "Hanoi",
        district: "Ba Dinh",
        details: "1 Main Street"
      },
      birthplace: {
        city: "Hanoi"
      },
      isActive: true,
      profileImage: "",
      Skills: []
    });
    await db.close();
  });
});
