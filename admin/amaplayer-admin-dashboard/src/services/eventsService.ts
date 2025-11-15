import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'tournament' | 'workshop' | 'competition' | 'training' | 'meetup' | 'seminar' | 'other';
  imageUrl?: string;
  registrationUrl?: string;
  maxParticipants: number;
  participants?: string[];
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
  requirements?: string[];
  prizes?: string[];
  tags?: string[];
}

class EventsService {
  private collectionName = 'events';

  // Create new event
  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'participants'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants: [],
        organizer: eventData.organizer || 'Admin',
        contactEmail: eventData.contactEmail || 'admin@amaplayer.com'
      });
      
      console.log('Event created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Get all events
  async getAllEvents(): Promise<Event[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get active events (for mobile app)
  async getActiveEvents(): Promise<Event[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const events: Event[] = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() } as Event);
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching active events:', error);
      throw error;
    }
  }

  // Update event
  async updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
    try {
      const eventRef = doc(db, this.collectionName, eventId);
      await updateDoc(eventRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      console.log('Event updated successfully:', eventId);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, eventId));
      console.log('Event deleted successfully:', eventId);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Toggle event active status
  async toggleEventStatus(eventId: string, isActive: boolean): Promise<void> {
    try {
      await this.updateEvent(eventId, { isActive });
      console.log(`Event ${eventId} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling event status:', error);
      throw error;
    }
  }

  // Bulk activate events
  async bulkActivateEvents(eventIds: string[], reason?: string): Promise<{ processedCount: number; failedCount: number; errors: Array<{ eventId: string; error: string }> }> {
    const result = {
      processedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    };

    for (const eventId of eventIds) {
      try {
        await this.toggleEventStatus(eventId, true);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Bulk deactivate events
  async bulkDeactivateEvents(eventIds: string[], reason?: string): Promise<{ processedCount: number; failedCount: number; errors: Array<{ eventId: string; error: string }> }> {
    const result = {
      processedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    };

    for (const eventId of eventIds) {
      try {
        await this.toggleEventStatus(eventId, false);
        result.processedCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          eventId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }
}

export const eventsService = new EventsService();