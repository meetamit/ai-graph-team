'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CopyIcon } from 'lucide-react';
import { Graph } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GraphListItemProps {
  graph: Graph;
}

export function GraphListItem({ graph }: GraphListItemProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cloneTitle, setCloneTitle] = useState(`${graph.title} (2)`);
  const [isCloning, setIsCloning] = useState(false);

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const response = await fetch(`/api/graph/${graph.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: cloneTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to clone graph');
      }

      const clonedGraph = await response.json();
      setIsDialogOpen(false);
      router.push(`/graph/${clonedGraph.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error cloning graph:', error);
      alert('Failed to clone graph. Please try again.');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      <li className="group flex items-center justify-between hover:bg-gray-50 px-2 py-1 rounded transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <a className="underline flex-1 truncate" href={`/graph/${graph.id}`}>
            {graph.title}
          </a>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {new Date(graph.createdAt).toLocaleString()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="inline"
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
          onClick={(e) => {
            e.preventDefault();
            setIsDialogOpen(true);
          }}
          title="Clone graph"
        >
          <CopyIcon className="h-4 w-4" />
        </Button>
      </li>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Graph</DialogTitle>
            <DialogDescription>
              Enter a name for the cloned graph.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={cloneTitle}
              onChange={(e) => setCloneTitle(e.target.value)}
              placeholder="Graph title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCloning && cloneTitle.trim()) {
                  handleClone();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCloning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClone}
              disabled={isCloning || !cloneTitle.trim()}
            >
              {isCloning ? 'Cloning...' : 'Clone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

