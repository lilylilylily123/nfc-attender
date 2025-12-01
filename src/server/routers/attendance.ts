import { z } from "zod";
import { router, publicProcedure } from "../trpc";

const TIMESTAMP_FIELDS = ["time_in", "time_out", "lunch_out", "lunch_in"] as const;
const STATUS_FIELDS = ["status", "lunch_status"] as const;
const ALLOWED_STATUSES = ["present", "late", "absent"] as const;

export const attendanceRouter = router({
  // Get attendance records for a date
  list: publicProcedure
    .input(
      z.object({
        date: z.string().optional(),
        learnerId: z.string().optional(),
        page: z.number().default(1),
        perPage: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { pb } = ctx;
      const { learnerId, page, perPage } = input;
      const date = input.date || new Date().toISOString().split("T")[0];

      const filterParts: string[] = [`date ~ "${date}"`];
      if (learnerId) {
        filterParts.push(`learner = "${learnerId}"`);
      }

      const response = await pb.collection("attendance").getList(page, perPage, {
        filter: filterParts.join(" && "),
        expand: "learner",
        sort: "-created",
      });

      return {
        items: response.items,
        totalItems: response.totalItems,
        totalPages: response.totalPages,
        date,
      };
    }),

  // Get attendance for a specific learner on a date
  get: publicProcedure
    .input(
      z.object({
        learnerId: z.string(),
        date: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { pb } = ctx;
      const { learnerId } = input;
      const date = input.date || new Date().toISOString().split("T")[0];

      try {
        const record = await pb.collection("attendance").getFirstListItem(
          `learner = "${learnerId}" && date ~ "${date}"`,
          { expand: "learner" }
        );
        return { attendance: record, exists: true };
      } catch {
        return { attendance: null, exists: false, date };
      }
    }),

  // Update a specific field on attendance
  update: publicProcedure
    .input(
      z.object({
        learnerId: z.string(),
        field: z.string(),
        date: z.string().optional(),
        value: z.string().optional(),
        timestamp: z.string().optional(),
        force: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { pb } = ctx;
      const { learnerId, field, value, timestamp, force } = input;
      const date = input.date || new Date().toISOString().split("T")[0];

      const isTimestampField = TIMESTAMP_FIELDS.includes(field as any);
      const isStatusField = STATUS_FIELDS.includes(field as any);

      if (!isTimestampField && !isStatusField) {
        throw new Error(`Invalid field. Allowed: ${[...TIMESTAMP_FIELDS, ...STATUS_FIELDS].join(", ")}`);
      }

      if (isStatusField && value && !ALLOWED_STATUSES.includes(value as any)) {
        throw new Error(`Invalid status value. Allowed: ${ALLOWED_STATUSES.join(", ")}`);
      }

      // Verify learner exists
      try {
        await pb.collection("learners").getOne(learnerId);
      } catch {
        throw new Error(`Learner not found: ${learnerId}`);
      }

      // Get or create attendance record
      let attendance;
      const allForLearner = await pb.collection("attendance").getFullList({
        filter: `learner = "${learnerId}"`,
      });

      attendance = allForLearner.find((r) => {
        const recordDate = r.date?.split?.(" ")?.[0] || r.date?.split?.("T")?.[0] || r.date;
        return recordDate === date;
      });

      if (attendance) {
        console.log(`[attendance/update] Found existing record: ${attendance.id}`);
      } else {
        console.log(`[attendance/update] Creating new record for ${learnerId} on ${date}`);
        attendance = await pb.collection("attendance").create({
          learner: learnerId,
          date: date,
        });
      }

      // Check if timestamp field already has a value (no overwrites unless force)
      if (isTimestampField && attendance[field] && !force) {
        return {
          status: "already_set" as const,
          field,
          existingValue: attendance[field],
          attendance,
        };
      }

      // Determine value to set
      let updateValue: string;
      if (isTimestampField) {
        updateValue = timestamp || new Date().toISOString();
      } else {
        updateValue = value!;
      }

      // Update the record
      const updated = await pb.collection("attendance").update(
        attendance.id,
        { [field]: updateValue },
        { expand: "learner" }
      );

      return {
        status: "updated" as const,
        field,
        value: updateValue,
        attendance: updated,
      };
    }),

  // Reset attendance for a learner on a date
  reset: publicProcedure
    .input(
      z.object({
        learnerId: z.string(),
        date: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { pb } = ctx;
      const { learnerId } = input;
      const date = input.date || new Date().toISOString().split("T")[0];

      try {
        const record = await pb.collection("attendance").getFirstListItem(
          `learner = "${learnerId}" && date ~ "${date}"`
        );

        const updated = await pb.collection("attendance").update(
          record.id,
          {
            time_in: null,
            time_out: null,
            lunch_out: null,
            lunch_in: null,
            status: null,
            lunch_status: null,
          },
          { expand: "learner" }
        );

        return { status: "reset" as const, attendance: updated };
      } catch {
        return { status: "no_record" as const, message: "No attendance record found for this date" };
      }
    }),
});
