import { Participant } from "./participant.interface";

export interface ParticipantsResponse {
  call_id: string;
  participants: Participant[];
}
