import Lead, { LEAD_STATUSES } from '../models/Lead.js';
import asyncHandler from '../utils/asyncHandler.js';

const startOfDayValue = (now) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

const startOfWeekValue = (now) => {
  const start = startOfDayValue(now);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const startOfMonthValue = (now) => new Date(now.getFullYear(), now.getMonth(), 1);

const buildStatusCounts = () =>
  LEAD_STATUSES.reduce((counts, status) => {
    counts[status] = { $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } };
    return counts;
  }, {});

const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfDay = startOfDayValue(now);
  const startOfWeek = startOfWeekValue(now);
  const startOfMonth = startOfMonthValue(now);

  const [result] = await Lead.aggregate([
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              createdToday: { $sum: { $cond: [{ $gte: ['$createdAt', startOfDay] }, 1, 0] } },
              createdThisWeek: { $sum: { $cond: [{ $gte: ['$createdAt', startOfWeek] }, 1, 0] } },
              createdThisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0] } },
              ...buildStatusCounts(),
            },
          },
        ],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 1,
              'customer.fullName': 1,
              'customer.phone': 1,
              'customer.email': 1,
              'moveDetails.movingFrom': 1,
              'moveDetails.movingTo': 1,
              'moveDetails.movingDate': 1,
              status: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const totals = (result?.totals && result.totals[0]) || {
    total: 0,
    createdToday: 0,
    createdThisWeek: 0,
    createdThisMonth: 0,
    ...LEAD_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {}),
  };

  const recentLeads = (result?.recent || []).map(({ _id, customer, moveDetails, status, createdAt }) => ({
    id: _id.toString(),
    customer,
    moveDetails,
    status,
    createdAt,
  }));

  return res.status(200).json({
    success: true,
    data: {
      statistics: totals,
      recentLeads,
    },
  });
});

export default { getStats };