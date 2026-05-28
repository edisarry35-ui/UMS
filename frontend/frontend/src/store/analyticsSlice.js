import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from '../api/axios';

const initialState = {
  status: 'idle',
  error: null,
  summary: {
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    studentCount: 0,
    programCount: 0,
    schoolYearCount: 0
  },
  chartData: {
    schoolYearChart: [],
    cumulativeChart: [],
    programChart: [],
    semesterChart: [],
    sectionChart: []
  },
  topPrograms: []
};

const parseAmount = (value) => parseFloat(value?.replace(/[₱,]/g, '') || '0') || 0;

const buildAnalytics = (definedSchoolYears = [], students = []) => {
  const schoolYearStats = {};
  const semesterStats = {};
  const programStats = {};
  const sectionStats = {};
  const studentIds = new Set();

  students.forEach((student) => {
    if (!student?._id) return;
    studentIds.add(student._id);

    const programKey = student.program || 'Unknown';
    const sectionKey = `${programKey} - ${student.section || 'Unknown'}`;

    if (!programStats[programKey]) {
      programStats[programKey] = {
        program: programKey,
        totalStudents: 0,
        paidStudents: 0,
        totalAmount: 0,
        paidAmount: 0,
        processedStudents: [],
        processedPaidStudents: []
      };
    }

    if (!programStats[programKey].processedStudents.includes(student._id)) {
      programStats[programKey].totalStudents++;
      programStats[programKey].processedStudents.push(student._id);
    }

    if (!sectionStats[sectionKey]) {
      sectionStats[sectionKey] = {
        section: sectionKey,
        program: programKey,
        sectionName: student.section || 'Unknown',
        totalStudents: 0,
        paidStudents: 0,
        totalAmount: 0,
        paidAmount: 0,
        processedStudents: [],
        processedPaidStudents: []
      };
    }

    if (!sectionStats[sectionKey].processedStudents.includes(student._id)) {
      sectionStats[sectionKey].totalStudents++;
      sectionStats[sectionKey].processedStudents.push(student._id);
    }

    (student.schoolYears || []).forEach((schoolYear) => {
      const syKey = schoolYear.schoolYear;
      if (!schoolYearStats[syKey]) {
        schoolYearStats[syKey] = {
          schoolYear: syKey,
          totalStudents: 0,
          paidStudents: 0,
          totalAmount: 0,
          paidAmount: 0,
          processedStudents: [],
          processedPaidStudents: []
        };
      }

      if (!schoolYearStats[syKey].processedStudents.includes(student._id)) {
        schoolYearStats[syKey].totalStudents++;
        schoolYearStats[syKey].processedStudents.push(student._id);
      }

      (schoolYear.semesters || []).forEach((semester) => {
        const semKey = `${syKey} - ${semester.semester}`;
        if (!semesterStats[semKey]) {
          semesterStats[semKey] = {
            semester: semKey,
            schoolYear: syKey,
            semesterName: semester.semester,
            totalStudents: 0,
            paidStudents: 0,
            totalAmount: 0,
            paidAmount: 0,
            processedStudents: [],
            processedPaidStudents: []
          };
        }

        if (!semesterStats[semKey].processedStudents.includes(student._id)) {
          semesterStats[semKey].totalStudents++;
          semesterStats[semKey].processedStudents.push(student._id);
        }

        let studentHasPaidInSemester = false;
        let studentHasPaidInSchoolYear = false;

        Object.values(semester.payments || {}).forEach((paymentData) => {
          const amount = parseAmount(paymentData.amount);
          const isPaid = paymentData.status === 'paid';

          schoolYearStats[syKey].totalAmount += amount;
          semesterStats[semKey].totalAmount += amount;
          programStats[programKey].totalAmount += amount;
          sectionStats[sectionKey].totalAmount += amount;

          if (isPaid) {
            schoolYearStats[syKey].paidAmount += amount;
            semesterStats[semKey].paidAmount += amount;
            programStats[programKey].paidAmount += amount;
            sectionStats[sectionKey].paidAmount += amount;
            studentHasPaidInSemester = true;
            studentHasPaidInSchoolYear = true;
          }
        });

        if (studentHasPaidInSemester && !semesterStats[semKey].processedPaidStudents.includes(student._id)) {
          semesterStats[semKey].paidStudents++;
          semesterStats[semKey].processedPaidStudents.push(student._id);
        }

        if (studentHasPaidInSchoolYear && !schoolYearStats[syKey].processedPaidStudents.includes(student._id)) {
          schoolYearStats[syKey].paidStudents++;
          schoolYearStats[syKey].processedPaidStudents.push(student._id);
        }

        if (studentHasPaidInSchoolYear && !programStats[programKey].processedPaidStudents.includes(student._id)) {
          programStats[programKey].paidStudents++;
          programStats[programKey].processedPaidStudents.push(student._id);
        }

        if (studentHasPaidInSchoolYear && !sectionStats[sectionKey].processedPaidStudents.includes(student._id)) {
          sectionStats[sectionKey].paidStudents++;
          sectionStats[sectionKey].processedPaidStudents.push(student._id);
        }
      });
    });
  });

  definedSchoolYears.forEach((schoolYear) => {
    if (!schoolYearStats[schoolYear]) {
      schoolYearStats[schoolYear] = {
        schoolYear,
        totalStudents: 0,
        paidStudents: 0,
        totalAmount: 0,
        paidAmount: 0,
        processedStudents: [],
        processedPaidStudents: []
      };
    }

    ['1st', '2nd'].forEach((semesterName) => {
      const semKey = `${schoolYear} - ${semesterName}`;
      if (!semesterStats[semKey]) {
        semesterStats[semKey] = {
          semester: semKey,
          schoolYear,
          semesterName,
          totalStudents: 0,
          paidStudents: 0,
          totalAmount: 0,
          paidAmount: 0,
          processedStudents: [],
          processedPaidStudents: []
        };
      }
    });
  });

  const schoolYearChart = Object.values(schoolYearStats)
    .sort((a, b) => a.schoolYear.localeCompare(b.schoolYear))
    .map((item) => ({
      name: item.schoolYear,
      paidAmount: item.paidAmount,
      pendingAmount: item.totalAmount - item.paidAmount,
      totalAmount: item.totalAmount
    }));

  let cumulativePaid = 0;
  let cumulativeTotal = 0;
  const cumulativeChart = Object.values(schoolYearStats)
    .sort((a, b) => a.schoolYear.localeCompare(b.schoolYear))
    .map((item) => {
      cumulativePaid += item.paidAmount;
      cumulativeTotal += item.totalAmount;
      return {
        name: item.schoolYear,
        cumulativePaid,
        cumulativePending: cumulativeTotal - cumulativePaid,
        cumulativeTotal
      };
    });

  const programChart = Object.values(programStats)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((item) => ({
      name: item.program.length > 16 ? `${item.program.substring(0, 16)}...` : item.program,
      fullName: item.program,
      paidAmount: item.paidAmount,
      pendingAmount: item.totalAmount - item.paidAmount,
      totalAmount: item.totalAmount
    }));

  const semesterChart = Object.values(semesterStats)
    .sort((a, b) => a.schoolYear.localeCompare(b.schoolYear) || a.semesterName.localeCompare(b.semesterName))
    .map((item) => ({
      name: `${item.schoolYear} ${item.semesterName}`,
      paidAmount: item.paidAmount,
      pendingAmount: item.totalAmount - item.paidAmount,
      totalAmount: item.totalAmount
    }));

  const sectionChart = Object.values(sectionStats)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((item) => ({
      name: item.section.length > 18 ? `${item.section.substring(0, 18)}...` : item.section,
      fullName: item.section,
      paidAmount: item.paidAmount,
      pendingAmount: item.totalAmount - item.paidAmount,
      totalAmount: item.totalAmount
    }));

  const totalAmount = schoolYearChart.reduce((sum, item) => sum + item.totalAmount, 0);
  const paidAmount = schoolYearChart.reduce((sum, item) => sum + item.paidAmount, 0);
  const pendingAmount = totalAmount - paidAmount;

  const topPrograms = Object.values(programStats)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 6)
    .map((item) => ({
      name: item.program,
      students: item.totalStudents,
      paidAmount: item.paidAmount,
      totalAmount: item.totalAmount
    }));

  return {
    chartData: {
      schoolYearChart,
      cumulativeChart,
      programChart,
      semesterChart,
      sectionChart
    },
    summary: {
      totalAmount,
      paidAmount,
      pendingAmount,
      studentCount: studentIds.size,
      programCount: Object.keys(programStats).length,
      schoolYearCount: Object.keys(schoolYearStats).length
    },
    topPrograms
  };
};

export const fetchAnalytics = createAsyncThunk('analytics/fetchAnalytics', async (_, { rejectWithValue }) => {
  try {
    const [schoolYearsRes, studentsRes] = await Promise.all([
      axios.get('/school-years'),
      axios.get('/students')
    ]);
    const definedSchoolYears = schoolYearsRes.data || [];
    const students = studentsRes.data || [];
    return buildAnalytics(definedSchoolYears, students);
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to load analytics');
  }
});

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.chartData = action.payload.chartData;
        state.summary = action.payload.summary;
        state.topPrograms = action.payload.topPrograms;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  }
});

export default analyticsSlice.reducer;
