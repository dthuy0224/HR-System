const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Project = require("../models/project");
const config_passport = require("../config/passport.js");
const moment = require("moment");
const Leave = require("../models/leave");
const Attendance = require("../models/attendance");
const { isLoggedIn, isAdmin } = require("./middleware");
const locations = require('../helpers/locations');
const upload = require('../middleware/fileUpload');

/**
 * Dashboard route for admin
 * This displays statistics about users, attendance, and other metrics
 */
router.get("/dashboard", async function viewDashboard(req, res, next) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get system statistics
    const [
      totalEmployees,
      totalManagers,
      totalProjects,
      todayAttendance,
      pendingLeaves,
      totalLeaves
    ] = await Promise.all([
      // Count total employees
      User.countDocuments({ type: "employee" }),
      
      // Count total managers
      User.countDocuments({ 
        type: { $in: ["project_manager", "accounts_manager"] } 
      }),
      
      // Count total projects
      Project.countDocuments({}),
      
      // Get today's attendance count
      Attendance.countDocuments({
        date: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear()
      }),
      
      // Count pending leaves
      Leave.countDocuments({ adminResponse: "Pending" }),
      
      // Count total leaves
      Leave.countDocuments({})
    ]);

    res.render("Admin/dashboard", {
      title: "Admin Dashboard",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      totalEmployees,
      totalManagers,
      totalProjects,
      todayAttendance,
      pendingLeaves,
      totalLeaves,
      moment: moment
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Displays home page to the admin
router.get("/", async function viewHome(req, res, next) {
  try {
    // Kiểm tra xem user đã đăng nhập chưa
    if (!req.user) {
      return res.redirect('/');  // Redirect về trang login nếu chưa đăng nhập
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get system statistics
    const [
      totalEmployees,
      totalManagers,
      totalProjects,
      todayAttendance,
      pendingLeaves,
      totalLeaves
    ] = await Promise.all([
      // Count total employees
      User.countDocuments({ type: "employee" }),
      
      // Count total managers
      User.countDocuments({ 
        type: { $in: ["project_manager", "accounts_manager"] } 
      }),
      
      // Count total projects
      Project.countDocuments({}),
      
      // Get today's attendance count
      Attendance.countDocuments({
        date: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear()
      }),
      
      // Count pending leaves
      Leave.countDocuments({ adminResponse: "Pending" }),
      
      // Count total leaves
      Leave.countDocuments({})
    ]);

    res.render("Admin/adminHome", {
      title: "Admin Home",
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      totalEmployees,
      totalManagers, 
      totalProjects,
      todayAttendance,
      pendingLeaves,
      totalLeaves,
      moment: moment
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Error loading dashboard");
  }
});

/**
 * Route to fetch employees with search, sort and pagination
 */
router.get('/view-all-employees', async (req, res) => {
  try {
    const { search = '', sort = 'asc', page = 1 } = req.query;
    const limit = 10; // items per page
    const skip = (page - 1) * limit;

    // Build query for search
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Get total count for pagination
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Fetch employees and sort by name
    const users = await User.find(query)
      .sort({ name: sort === 'asc' ? 1 : -1 })
      .select('name email type department startDate') // Only select needed fields
      .skip(skip)
      .limit(limit);

    res.render('Admin/viewAllEmployee', {
      title: 'View Employees',
      users,
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      moment,
      pagination: {
        page: parseInt(page),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      search,
      sort
    });

  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).send('Error fetching employees');
  }
});

// Export employees list
router.get('/export-employees', async (req, res) => {
  try {
    const { format } = req.query;
    const users = await User.find({}).sort({ name: 1 });

    if (format === 'pdf') {
      // Generate PDF using PDFKit
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=employees.pdf');
      
      doc.pipe(res);
      doc.fontSize(16).text('Employees List', { align: 'center' });
      doc.moveDown();

      users.forEach((user, index) => {
        doc.fontSize(12).text(`${index + 1}. ${user.name} - ${user.email} (${user.department || 'N/A'})`);
        doc.moveDown(0.5);
      });

      doc.end();

    } else if (format === 'excel') {
      // Generate Excel using ExcelJS
      const Excel = require('exceljs');
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Employees');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 5 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Role', key: 'type', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Start Date', key: 'createdAt', width: 15 }
      ];

      users.forEach((user, index) => {
        worksheet.addRow({
          id: index + 1,
          name: user.name,
          email: user.email,
          type: user.type,
          department: user.department || 'N/A',
          createdAt: moment(user.createdAt).format('DD/MM/YYYY')
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    }

  } catch (err) {
    console.error('Error exporting employees:', err);
    res.status(500).send('Error exporting employees');
  }
});

// Displays profile of the employee with the help of the id of the employee from the parameters.
router.get("/employee-profile/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("Admin/employeeProfile", {
      title: "Employee Profile",
      employee: user,
      csrfToken: req.csrfToken(),
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee profile");
  }
});

// Displays the attendance sheet of the given employee to the admin.
router.get("/view-employee-attendance/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const attendances = await Attendance.find({ employeeID: id }).sort({
      _id: -1,
    });
    const user = await User.findById(id);

    res.render("Admin/employeeAttendanceSheet", {
      title: "Employee Attendance Sheet",
      month: req.body.month,
      csrfToken: req.csrfToken(),
      found: attendances.length > 0 ? 1 : 0,
      attendance: attendances,
      moment: moment,
      userName: req.user.name,
      employee_name: user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee attendance");
  }
});

// Displays edit employee form to the admin.
router.get("/edit-employee/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("Admin/editEmployee", {
      title: "Edit Employee",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/admin/");
  }
});

// First it gets attributes of the logged in admin from the User Schema.
router.get("/view-profile", async (req, res, next) => {
  const { _id, name } = req.user;
  try {
    const user = await User.findById(_id);
    res.render("Admin/viewProfile", {
      title: "Profile",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      userName: name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving profile");
  }
});

// Displays add employee form to the admin.
router.get("/add-employee", isLoggedIn, isAdmin, (req, res, next) => {
  const { name } = req.user;
  const messages = req.flash("error");

  res.render("Admin/addEmployee", {
    title: "Add New Employee",
    csrfToken: req.csrfToken(),
    user: config_passport.User,
    messages,
    hasErrors: messages.length > 0,
    userName: name,
  });
});

/**
 * First it gets the id of the given employee from the parameters.
 * Finds the project of the employee from Project Schema with the help of that id.
 * Then displays all the projects of the given employee.
 */
router.get("/all-employee-projects/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const projects = await Project.find({ employeeID: id }).sort({ _id: -1 });
    const user = await User.findById(id);

    res.render("Admin/employeeAllProjects", {
      title: "List Of Employee Projects",
      hasProject: projects.length > 0 ? 1 : 0,
      projects,
      csrfToken: req.csrfToken(),
      user,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving employee projects");
  }
});

// Displays the list of all the leave applications applied by all employees.
router.get("/leave-applications", async (req, res, next) => {
  try {
    const leaves = await Leave.find({}).sort({ _id: -1 });
    const hasLeave = leaves.length > 0 ? 1 : 0;

    const employeeChunks = await Promise.all(
      leaves.map((leave) => User.findById(leave.applicantID))
    );

    res.render("Admin/allApplications", {
      title: "List Of Leave Applications",
      csrfToken: req.csrfToken(),
      hasLeave,
      leaves,
      employees: employeeChunks,
      moment: moment,
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving leave applications");
  }
});

/**
 * Gets the leave id and employee id from the parameters.
 * Then shows the response application form of that leave of the employee to the admin.
 */
router.get(
  "/respond-application/:leave_id/:employee_id",
  async (req, res, next) => {
    const { leave_id: leaveID, employee_id: employeeID } = req.params;
    try {
      const leave = await Leave.findById(leaveID);
      const user = await User.findById(employeeID);

      res.render("Admin/applicationResponse", {
        title: "Respond Leave Application",
        csrfToken: req.csrfToken(),
        leave,
        employee: user,
        moment: moment,
        userName: req.user.name,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error responding to application");
    }
  }
);

/**
 * Gets id of the projet to be edit.
 * Displays the form of the edit project to th admin.
 */
router.get("/edit-employee-project/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await Project.findById(id);
    res.render("Admin/editProject", {
      title: "Edit Employee",
      csrfToken: req.csrfToken(),
      project,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving project");
  }
});

/**
 * Gets the id of the employee from parameters.
 * Displays the add employee project form to the admin.
 */
router.get("/add-employee-project/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    res.render("Admin/addProject", {
      title: "Add Employee Project",
      csrfToken: req.csrfToken(),
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
    });
  } catch (err) {
    res.redirect("/admin/");
  }
});

router.get("/employee-project-info/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const project = await Project.findById(id);
    const user = await User.findById(project.employeeID);
    res.render("Admin/projectInfo", {
      title: "Employee Project Information",
      project: project,
      employee: user,
      moment: moment,
      message: "",
      userName: req.user.name,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});

router.get("/redirect-employee-profile", async (req, res, next) => {
  const { id } = req.user;
  try {
    const user = await User.findById(id);
    res.redirect(`/admin/employee-profile/${id}`);
  } catch (err) {
    console.log(err);
  }
});

// Displays the admin its own attendance sheet
router.post("/view-attendance", async (req, res, next) => {
  const { month, year } = req.body;
  const { _id, name } = req.user;
  try {
    const attendance = await Attendance.find({
      employeeID: _id,
      month,
      year,
    }).sort({ _id: -1 });
    const found = attendance.length > 0 ? 1 : 0;
    res.render("Admin/viewAttendanceSheet", {
      title: "Attendance Sheet",
      month,
      csrfToken: req.csrfToken(),
      found,
      attendance,
      userName: name,
      moment: moment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing attendance");
  }
});

/**
 * After marking attendance.
 * Shows current attendance to the admin.
 */
router.get("/view-attendance-current", async (req, res, next) => {
  const { _id, name } = req.user;
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  try {
    const attendance = await Attendance.find({
      employeeID: _id,
      month,
      year,
    }).sort({ _id: -1 });
    const found = attendance.length > 0 ? 1 : 0;
    res.render("Admin/viewAttendanceSheet", {
      title: "Attendance Sheet",
      month,
      csrfToken: req.csrfToken(),
      found,
      attendance,
      moment: moment,
      userName: name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error viewing current attendance");
  }
});

/**
 * View all attendance with improved real-time statistics
 */
router.get('/all-attendance', async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    
    // Get all attendance records for the specified month
    const attendances = await Attendance.find({
      month: parseInt(month),
      year: parseInt(year)
    })
    .populate('employeeID')
    .sort({ date: -1, checkInTime: -1 });

    // Calculate detailed statistics
    const stats = {
      present: 0,
      leave: 0,
      late: 0,
      onTime: 0,
      halfDay: 0,
      overtime: 0,
      totalEarlyMinutes: 0,
      totalLateMinutes: 0,
      totalOvertimeHours: 0
    };

    const totalRecords = attendances.length;

    attendances.forEach(att => {
      switch(att.status) {
        case 'present':
          stats.present++;
          if (att.lateMinutes === 0) stats.onTime++;
          break;
        case 'late':
          stats.late++;
          break;
        case 'leave':
          stats.leave++;
          break;
        case 'halfDay':
          stats.halfDay++;
          break;
        case 'overtime':
          stats.overtime++;
          break;
      }

      stats.totalEarlyMinutes += att.earlyMinutes || 0;
      stats.totalLateMinutes += att.lateMinutes || 0;
      stats.totalOvertimeHours += att.overtime || 0;
    });

    // Calculate percentages
    const calculatePercentage = (value) => {
      return totalRecords > 0 ? ((value / totalRecords) * 100).toFixed(1) : 0;
    };

    stats.presentPercentage = calculatePercentage(stats.present);
    stats.leavePercentage = calculatePercentage(stats.leave);
    stats.latePercentage = calculatePercentage(stats.late);
    stats.onTimePercentage = calculatePercentage(stats.onTime);

    res.render('Admin/allAttendance', {
      title: 'Attendance Management',
      attendances,
      stats,
      month: parseInt(month),
      year: parseInt(year),
      moment,
      workConfig: require('../config/workSchedule'),
      csrfToken: req.csrfToken(),
      userName: req.user.name
    });
  } catch (err) {
    console.error('Error fetching attendance data:', err);
    res.status(500).send('Error retrieving attendance data');
  }
});

/**
 * Edit attendance record with real-time update
 */
router.post('/edit-attendance/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).send('Attendance record not found');
    }

    const { checkInTime, checkOutTime, status, notes } = req.body;

    if (checkInTime) {
      // Combine date from attendance with time from input
      const date = new Date(attendance.year, attendance.month - 1, attendance.date);
      const [hours, minutes] = checkInTime.split(':');
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      attendance.checkInTime = date;
    }

    if (checkOutTime) {
      const date = new Date(attendance.year, attendance.month - 1, attendance.date);
      const [hours, minutes] = checkOutTime.split(':');
      date.setHours(parseInt(hours), parseInt(minutes), 0);
      attendance.checkOutTime = date;
    }

    if (status) {
      attendance.status = status;
    }

    if (notes) {
      attendance.notes = notes;
    }

    attendance.edited = true;
    attendance.editedBy = req.user._id;
    attendance.editedAt = new Date();

    await attendance.save();

    // Emit real-time update
    if (req.app.io) {
      // Recalculate stats
      const month = attendance.month;
      const year = attendance.year;
      const stats = await calculateAttendanceStats(month, year);
      
      req.app.io.emit('attendanceUpdate', {
        attendance: await attendance.populate('employeeID'),
        stats
      });
    }
    
    // Redirect back
    res.redirect(`/admin/all-attendance?month=${attendance.month}&year=${attendance.year}`);
  } catch (err) {
    console.error('Error updating attendance:', err);
    res.status(500).send('Error updating attendance record');
  }
});

// Helper function to calculate attendance statistics
async function calculateAttendanceStats(month, year) {
  const attendances = await Attendance.find({ month, year });
  
  const stats = {
    present: 0,
    leave: 0,
    late: 0,
    onTime: 0,
    totalRecords: attendances.length
  };

  attendances.forEach(att => {
    if (att.status === 'present') {
      stats.present++;
      if (att.lateMinutes === 0) stats.onTime++;
    } else if (att.status === 'late') {
      stats.late++;
    } else if (att.status === 'leave') {
      stats.leave++;
    }
  });

  // Calculate percentages
  const calculatePercentage = (value) => {
    return stats.totalRecords > 0 ? ((value / stats.totalRecords) * 100).toFixed(1) : 0;
  };

  stats.presentPercentage = calculatePercentage(stats.present);
  stats.leavePercentage = calculatePercentage(stats.leave);
  stats.latePercentage = calculatePercentage(stats.late);
  stats.onTimePercentage = calculatePercentage(stats.onTime);

  return stats;
}

/**
 * View pending attendance edit requests
 */
router.get('/attendance-edit-requests', async (req, res) => {
  try {
    // Find all attendance records with pending edit requests
    const records = await Attendance.find({
      'editRequest.requested': true,
      'editRequest.status': 'pending'
    })
    .populate('employeeID')
    .sort({year: -1, month: -1, date: -1});
    
    res.render('Admin/attendanceEditRequests', {
      title: 'Attendance Edit Requests',
      records: records,
      csrfToken: req.csrfToken(),
      userName: req.user.name,
      moment: moment
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send("Error fetching edit requests");
  }
});

/**
 * Process attendance edit request (approve/reject)
 */
router.post('/process-edit-request', async (req, res) => {
  const { attendanceId, action, managerNotes } = req.body;
  
  if (!attendanceId || !action) {
    return res.status(400).send("Missing required information");
  }
  
  try {
    const attendance = await Attendance.findById(attendanceId);
    
    if (!attendance) {
      return res.status(404).send("Attendance record not found");
    }
    
    if (action === 'approve') {
      attendance.editRequest.status = 'approved';
      attendance.edited = true;
      
      // If additional fields to edit were provided
      if (req.body.checkInTime) {
        attendance.checkInTime = new Date(req.body.checkInTime);
      }
      
      if (req.body.checkOutTime) {
        attendance.checkOutTime = new Date(req.body.checkOutTime);
        
        // Recalculate work hours if both times are present
        if (attendance.checkInTime) {
          const checkIn = new Date(attendance.checkInTime);
          const checkOut = new Date(attendance.checkOutTime);
          
          // Calculate work hours
          const diffMs = checkOut - checkIn;
          const diffHrs = diffMs / (1000 * 60 * 60);
          attendance.workHours = parseFloat(diffHrs.toFixed(2));
          
          // Calculate overtime
          if (attendance.workHours > 8) {
            attendance.overtime = parseFloat((attendance.workHours - 8).toFixed(2));
          } else {
            attendance.overtime = 0;
          }
          
          // Update status if needed
          if (attendance.workHours >= 4 && attendance.workHours < 8) {
            attendance.status = 'halfDay';
          } else if (attendance.workHours >= 8 && attendance.overtime > 0) {
            attendance.status = 'overtime';
          }
        }
      }
      
      if (req.body.status) {
        attendance.status = req.body.status;
      }
      
      if (managerNotes) {
        attendance.notes = managerNotes;
      }
      
      attendance.editRequest.approvedBy = req.user._id;
    } else if (action === 'reject') {
      attendance.editRequest.status = 'rejected';
      if (managerNotes) {
        attendance.notes = managerNotes;
      }
    }
    
    await attendance.save();
    return res.redirect('/admin/attendance-edit-requests');
  } catch (err) {
    console.log(err);
    return res.status(500).send("Error processing request");
  }
});

router.get("/get-supervisors", async (req, res) => {
  try {
    const supervisors = await User.find({
      type: { $in: ["project_manager", "accounts_manager"] },
      isActive: true
    }).select('_id name');
    res.json(supervisors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching supervisors" });
  }
});

router.get("/get-next-job-id/:dept", async (req, res) => {
  try {
    const { dept } = req.params;
    // Get all job IDs starting with dept code
    const pattern = `^${dept}\\d{3}$`;
    const existingIds = await User.find({
      jobId: { $regex: pattern }
    }).select('jobId');

    // Get max sequence number
    let maxSeq = 0;
    existingIds.forEach(user => {
      const seq = parseInt(user.jobId.substring(3));
      if (seq > maxSeq) maxSeq = seq;
    });

    // Generate next ID
    const nextId = `${dept}${String(maxSeq + 1).padStart(3, '0')}`;
    res.json({ jobId: nextId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating job ID" });
  }
});

router.get("/get-cities", (req, res) => {
  const cities = locations.getCities();
  res.json(cities);
});

router.get("/get-districts/:city", (req, res) => {
  const districts = locations.getDistricts(req.params.city);
  res.json(districts);
});

module.exports = router;
