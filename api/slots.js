import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Supabase variables are missing",
        slots: [],
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: slots, error: slotsError } = await supabase
      .from("booking_slots")
      .select("*")
      .eq("is_active", true)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(200);

    if (slotsError) {
      return res.status(500).json({
        error: slotsError.message,
        slots: [],
      });
    }

    const { data: requests, error: requestsError } = await supabase
      .from("booking_requests")
      .select("slot_id,status")
      .neq("status", "cancelled");

    if (requestsError) {
      return res.status(500).json({
        error: requestsError.message,
        slots: [],
      });
    }

    const booked = {};

    (requests || []).forEach((request) => {
      booked[request.slot_id] = (booked[request.slot_id] || 0) + 1;
    });

    const availableSlots = (slots || [])
      .map((slot) => {
        const bookedCount = booked[slot.id] || 0;
        const capacity = Number(slot.capacity || 1);

        return {
          ...slot,
          booked: bookedCount,
          available: Math.max(capacity - bookedCount, 0),
        };
      })
      .filter((slot) => slot.available > 0);

    return res.status(200).json({
      slots: availableSlots,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Server error",
      slots: [],
    });
  }
}