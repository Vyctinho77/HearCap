package tasks

import (
	"context"
	"log"

	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	cron *cron.Cron
}

func NewScheduler() *Scheduler {
	return &Scheduler{
		cron: cron.New(
			cron.WithSeconds(),
		),
	}
}

func (s *Scheduler) Add(spec string, job func(ctx context.Context)) error {
	_, err := s.cron.AddFunc(spec, func() {
		job(context.Background())
	})
	return err
}

func (s *Scheduler) Start() {
	log.Println("scheduler: iniciado")
	s.cron.Start()
}

func (s *Scheduler) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
	log.Println("scheduler: parado")
}
